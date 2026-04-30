import { NextRequest, NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type ImportType = "expenses" | "milk" | "sales";

export interface ParsedRow {
  _row: number;
  _errors: string[];
  [key: string]: unknown;
}

export interface ImportPreview {
  type: ImportType;
  rows: ParsedRow[];
  totalRows: number;
  errorRows: number;
  columnMapping: Record<string, string>;
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can import data." }, { status: 403 });
  }

  const body = await req.json();
  const { type, csv, confirm, rows: confirmedRows } = body as {
    type: ImportType;
    csv?: string;
    confirm?: boolean;
    rows?: ParsedRow[];
  };

  if (!["expenses", "milk", "sales"].includes(type)) {
    return NextResponse.json({ error: "Invalid import type." }, { status: 400 });
  }

  // ── CONFIRM: insert pre-parsed rows ──────────────────────────────────────
  if (confirm && confirmedRows) {
    const validRows = confirmedRows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) {
      return NextResponse.json({ error: "No valid rows to insert." }, { status: 400 });
    }

    const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    const branchByName = Object.fromEntries(branches.map((b) => [b.name.toLowerCase().trim(), b.id]));

    let inserted = 0;

    if (type === "expenses") {
      await prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const branchId = branchByName[(row.branch_name as string).toLowerCase().trim()];
          if (!branchId) continue;
          await tx.expense.create({
            data: {
              date: new Date(row.date as string),
              branchId,
              category: row.category as ExpenseCategory,
              description: row.description as string,
              amount: Number(row.amount),
              paymentMethod: (((row.payment_method as string) || "CASH") as PaymentMethod),
              receiptReference: (row.receipt_reference as string) || null,
              periodStart: row.period_start ? new Date(row.period_start as string) : new Date(row.date as string),
              periodEnd: row.period_end ? new Date(row.period_end as string) : new Date(row.date as string),
              recordedById: user.id,
            },
          });
          inserted++;
        }
        await createAuditLog({
          userId: user.id,
          action: "CREATE",
          entityType: "Expense",
          entityId: "bulk-import",
          changes: { imported: inserted, source: "csv_import", bulk: true },
        });
      }, { timeout: 30000 });
    }

    if (type === "milk") {
      const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
      const supplierByName = Object.fromEntries(suppliers.map((s) => [s.name.toLowerCase().trim(), s.id]));

      await prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const branchId = branchByName[(row.branch_name as string).toLowerCase().trim()];
          const supplierId = supplierByName[(row.supplier_name as string).toLowerCase().trim()];
          if (!branchId || !supplierId) continue;
          const liters = Number(row.liters);
          const costPerLiter = Number(row.cost_per_liter);
          await tx.milkSupply.create({
            data: {
              date: new Date(row.date as string),
              branchId,
              supplierId,
              liters,
              costPerLiter,
              totalCost: liters * costPerLiter,
              retailPricePerLiter: Number(row.retail_price_per_liter ?? row.cost_per_liter),
              deliveryReference: (row.delivery_reference as string) || null,
              recordedById: user.id,
            },
          });
          inserted++;
        }
        await createAuditLog({
          userId: user.id,
          action: "CREATE",
          entityType: "MilkSupply",
          entityId: "bulk-import",
          changes: { imported: inserted, source: "csv_import", bulk: true },
        });
      }, { timeout: 30000 });
    }

    if (type === "sales") {
      await prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const branchId = branchByName[(row.branch_name as string).toLowerCase().trim()];
          if (!branchId) continue;
          const litersSold = Number(row.liters_sold);
          const pricePerLiter = Number(row.price_per_liter);
          await tx.sale.create({
            data: {
              date: new Date(row.date as string),
              branchId,
              litersSold,
              pricePerLiter,
              revenue: litersSold * pricePerLiter,
              recordedById: user.id,
            },
          });
          inserted++;
        }
        await createAuditLog({
          userId: user.id,
          action: "CREATE",
          entityType: "Sale",
          entityId: "bulk-import",
          changes: { imported: inserted, source: "csv_import", bulk: true },
        });
      }, { timeout: 30000 });
    }

    return NextResponse.json({ inserted });
  }

  // ── PARSE: send CSV to AI for interpretation ──────────────────────────────
  if (!csv || typeof csv !== "string" || csv.trim().length === 0) {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const suppliers = type === "milk"
    ? await prisma.supplier.findMany({ select: { id: true, name: true } })
    : [];

  const branchNames = branches.map((b) => b.name).join(", ");
  const supplierNames = suppliers.map((s) => s.name).join(", ");

  // Limit CSV to first 300 rows to avoid token overflow
  const csvLines = csv.trim().split("\n").slice(0, 301);
  const truncated = csvLines.length > 300;
  const csvSample = csvLines.slice(0, 301).join("\n");

  const schemaHints: Record<ImportType, string> = {
    expenses: `Required fields per row: branch_name (must match one of: ${branchNames}), date (YYYY-MM-DD), category (one of: SALARIES, MEALS, RENT, TRANSPORT, UTILITIES, MAINTENANCE, MISCELLANEOUS), description, amount (number, UGX).
Optional fields: payment_method (CASH or BANK, default CASH), receipt_reference, period_start (YYYY-MM-DD), period_end (YYYY-MM-DD).`,
    milk: `Required fields per row: branch_name (must match one of: ${branchNames}), supplier_name (must match one of: ${supplierNames}), date (YYYY-MM-DD), liters (number), cost_per_liter (number, UGX).
Optional fields: retail_price_per_liter (number, defaults to cost_per_liter if omitted), delivery_reference.`,
    sales: `Required fields per row: branch_name (must match one of: ${branchNames}), date (YYYY-MM-DD), liters_sold (number), price_per_liter (number, UGX).`,
  };

  const systemPrompt = `You are a CSV parsing assistant for a dairy cooperative management system. Parse the uploaded CSV and map its columns to the required schema fields.

${schemaHints[type]}

Rules:
- Map column headers to the field names above even if headers use different names (e.g. "Qty" → liters, "Branch" → branch_name, "Cost/L" → cost_per_liter).
- Normalise dates to YYYY-MM-DD format.
- Amounts/numbers: strip currency symbols and commas (e.g. "UGX 50,000" → 50000).
- For branch_name: match case-insensitively to the known branches. If ambiguous, use the closest match and add a warning in _errors.
- For category (expenses): map common variants (e.g. "fuel" → TRANSPORT, "salaries" → SALARIES, "rent" → RENT).
- Each row must have an _errors array listing any missing or invalid required fields.
- Do NOT invent data. If a required field is missing and cannot be inferred, add it to _errors.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "column_mapping": { "original header": "mapped field name" },
  "rows": [
    { "_row": 1, "_errors": [], "branch_name": "...", "date": "...", ... }
  ]
}`;

  const aiResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "minimaxai/minimax-m2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this CSV (${type}):\n\n${csvSample}` },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!aiResponse.ok) {
    const text = await aiResponse.text();
    console.error("NVIDIA AI error:", text);
    return NextResponse.json({ error: "AI parsing service unavailable. Please try again." }, { status: 502 });
  }

  const aiData = await aiResponse.json();
  const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if model wrapped response
  const jsonStr = rawContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  let parsed: { column_mapping: Record<string, string>; rows: ParsedRow[] };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("AI returned non-JSON:", rawContent.slice(0, 500));
    return NextResponse.json({ error: "AI could not parse the CSV. Please check the file format and try again." }, { status: 422 });
  }

  const rows: ParsedRow[] = (parsed.rows ?? []).map((r, i) => ({
    ...r,
    _row: r._row ?? i + 1,
    _errors: Array.isArray(r._errors) ? r._errors : [],
  }));

  const preview: ImportPreview = {
    type,
    rows,
    totalRows: rows.length + (truncated ? csvLines.length - 301 : 0),
    errorRows: rows.filter((r) => r._errors.length > 0).length,
    columnMapping: parsed.column_mapping ?? {},
  };

  return NextResponse.json(preview);
}
