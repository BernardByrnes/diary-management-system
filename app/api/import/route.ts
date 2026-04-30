import { NextRequest, NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

export const maxDuration = 60;

// ── Types ────────────────────────────────────────────────────────────────────

export type ImportType = "expenses" | "milk" | "sales" | "auto";

export interface ParsedRow {
  _row: number;
  _errors: string[];
  [key: string]: unknown;
}

export interface ImportPreview {
  type: Exclude<ImportType, "auto">;
  rows: ParsedRow[];
  totalRows: number;
  errorRows: number;
  columnMapping: Record<string, string>;
}

export interface AutoImportPreview {
  type: "auto";
  groups: {
    expenses?: { rows: ParsedRow[]; columnMapping: Record<string, string> };
    milk?: { rows: ParsedRow[]; columnMapping: Record<string, string> };
    sales?: { rows: ParsedRow[]; columnMapping: Record<string, string> };
  };
  totalRows: number;
  errorRows: number;
}

// ── Shared insert helpers ─────────────────────────────────────────────────────

async function insertExpenses(
  rows: ParsedRow[],
  branchByName: Record<string, string>,
  userId: string
): Promise<number> {
  let inserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (row._errors.length > 0) continue;
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
          recordedById: userId,
        },
      });
      inserted++;
    }
  }, { timeout: 30000 });
  if (inserted > 0) {
    await createAuditLog({ userId, action: "CREATE", entityType: "Expense", entityId: "bulk-import", changes: { imported: inserted, source: "csv_import", bulk: true } });
  }
  return inserted;
}

async function insertMilk(
  rows: ParsedRow[],
  branchByName: Record<string, string>,
  defaultSupplierId: string,
  userId: string
): Promise<number> {
  let inserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (row._errors.length > 0) continue;
      const branchId = branchByName[(row.branch_name as string).toLowerCase().trim()];
      if (!branchId) continue;
      const liters = Number(row.liters);
      const costPerLiter = Number(row.cost_per_liter);
      // Use period_end as the representative date if date is missing/is a period label
      const dateStr = (row.date as string) || (row.period_end as string);
      await tx.milkSupply.create({
        data: {
          date: new Date(dateStr),
          branchId,
          supplierId: defaultSupplierId,
          liters,
          costPerLiter,
          totalCost: liters * costPerLiter,
          retailPricePerLiter: row.retail_price_per_liter ? Number(row.retail_price_per_liter) : Number(row.cost_per_liter),
          deliveryReference: (row.delivery_reference as string) || null,
          recordedById: userId,
        },
      });
      inserted++;
    }
  }, { timeout: 30000 });
  if (inserted > 0) {
    await createAuditLog({ userId, action: "CREATE", entityType: "MilkSupply", entityId: "bulk-import", changes: { imported: inserted, source: "csv_import", bulk: true } });
  }
  return inserted;
}

async function insertSales(
  rows: ParsedRow[],
  branchByName: Record<string, string>,
  userId: string
): Promise<number> {
  let inserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (row._errors.length > 0) continue;
      const branchId = branchByName[(row.branch_name as string).toLowerCase().trim()];
      if (!branchId) continue;
      const litersSold = Number(row.liters_sold);
      const pricePerLiter = Number(row.price_per_liter);
      // Derive revenue: prefer explicit revenue column, else calculate
      const revenue = row.revenue ? Number(row.revenue) : litersSold * pricePerLiter;
      // Use period_end as representative date if date missing
      const dateStr = (row.date as string) || (row.period_end as string);
      await tx.sale.create({
        data: {
          date: new Date(dateStr),
          branchId,
          litersSold,
          pricePerLiter: pricePerLiter || (litersSold > 0 ? revenue / litersSold : 0),
          revenue,
          recordedById: userId,
        },
      });
      inserted++;
    }
  }, { timeout: 30000 });
  if (inserted > 0) {
    await createAuditLog({ userId, action: "CREATE", entityType: "Sale", entityId: "bulk-import", changes: { imported: inserted, source: "csv_import", bulk: true } });
  }
  return inserted;
}

function normaliseRows(rawRows: ParsedRow[]): ParsedRow[] {
  return (rawRows ?? []).map((r, i) => ({
    ...r,
    _row: r._row ?? i + 1,
    _errors: Array.isArray(r._errors) ? r._errors : [],
  }));
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can import data." }, { status: 403 });
  }

  const body = await req.json();
  const { type, csv, confirm, rows: confirmedRows, groups: confirmedGroups } = body as {
    type: ImportType;
    csv?: string;
    confirm?: boolean;
    rows?: ParsedRow[];
    groups?: { expenses?: ParsedRow[]; milk?: ParsedRow[]; sales?: ParsedRow[] };
  };

  if (!["expenses", "milk", "sales", "auto"].includes(type)) {
    return NextResponse.json({ error: "Invalid import type." }, { status: 400 });
  }

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const branchByName = Object.fromEntries(branches.map((b) => [b.name.toLowerCase().trim(), b.id]));

  // Fetch the single supplier — auto-filled on all milk import rows (no supplier column needed)
  const defaultSupplier = await prisma.supplier.findFirst({ select: { id: true, name: true } });
  if (!defaultSupplier) {
    return NextResponse.json({ error: "No supplier found in the database. Please add a supplier first." }, { status: 400 });
  }

  // ── CONFIRM ──────────────────────────────────────────────────────────────
  if (confirm) {
    if (type === "auto") {
      if (!confirmedGroups) return NextResponse.json({ error: "No groups provided." }, { status: 400 });

      const [expensesInserted, milkInserted, salesInserted] = await Promise.all([
        confirmedGroups.expenses?.length ? insertExpenses(confirmedGroups.expenses, branchByName, user.id) : Promise.resolve(0),
        confirmedGroups.milk?.length ? insertMilk(confirmedGroups.milk, branchByName, defaultSupplier.id, user.id) : Promise.resolve(0),
        confirmedGroups.sales?.length ? insertSales(confirmedGroups.sales, branchByName, user.id) : Promise.resolve(0),
      ]);

      return NextResponse.json({ inserted: expensesInserted + milkInserted + salesInserted, breakdown: { expenses: expensesInserted, milk: milkInserted, sales: salesInserted } });
    }

    // Single-type confirm
    if (!confirmedRows) return NextResponse.json({ error: "No rows provided." }, { status: 400 });
    const validRows = confirmedRows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) return NextResponse.json({ error: "No valid rows to insert." }, { status: 400 });

    let inserted = 0;
    if (type === "expenses") {
      inserted = await insertExpenses(validRows, branchByName, user.id);
    }
    if (type === "milk") {
      inserted = await insertMilk(validRows, branchByName, defaultSupplier.id, user.id);
    }
    if (type === "sales") {
      inserted = await insertSales(validRows, branchByName, user.id);
    }

    return NextResponse.json({ inserted });
  }

  // ── PARSE ────────────────────────────────────────────────────────────────
  if (!csv || typeof csv !== "string" || csv.trim().length === 0) {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }

  const branchNames = branches.map((b) => b.name).join(", ");

  const csvLines = csv.trim().split("\n").slice(0, 301);
  const truncated = csvLines.length > 300;
  const csvSample = csvLines.join("\n");

  const schemaHints = {
    expenses: `Expenses — required: branch_name (one of: ${branchNames}), date OR period_end (YYYY-MM-DD), category (SALARIES/MEALS/RENT/TRANSPORT/UTILITIES/MAINTENANCE/MISCELLANEOUS), description, amount (UGX). Optional: payment_method (CASH/BANK), receipt_reference, period_start, period_end.`,
    milk: `Milk deliveries — required: branch_name (one of: ${branchNames}), liters, cost_per_liter (UGX). Optional: date or period_end (YYYY-MM-DD; use period_end if only a period range is given), retail_price_per_liter, delivery_reference. NOTE: supplier is auto-filled — do NOT require a supplier_name column.`,
    sales: `Sales — required: branch_name (one of: ${branchNames}), liters_sold. Optional: date or period_end (YYYY-MM-DD), price_per_liter (UGX), revenue (UGX; use if price_per_liter not given).`,
  };

  if (type === "auto") {
    const systemPrompt = `You are a CSV parsing assistant for a dairy cooperative. This CSV may contain a mix of expenses, milk deliveries, and sales — often as a bimonthly period summary per branch (not necessarily daily rows).

Classify each row by data type and map its columns to the correct schema fields:

${schemaHints.expenses}
${schemaHints.milk}
${schemaHints.sales}

Rules:
- Identify each row's type from context clues: presence of category/description → expense; presence of liters + cost_per_liter → milk; presence of liters_sold or revenue without cost → sale.
- Map column headers to field names even if they differ (e.g. "Qty Litres" → liters, "UGX Amount" → amount, "Branch" → branch_name, "Period" → period_end).
- Normalise dates to YYYY-MM-DD. If only a period range is given (e.g. "Apr 1-15"), set period_start to the first date and period_end / date to the last date.
- Strip currency symbols and commas from numbers (e.g. "300,000" → 300000).
- Match branch names case-insensitively to: ${branchNames}. If a branch name is ambiguous, use the closest match and add a note to _errors.
- Do NOT require or invent a supplier_name for milk rows — supplier is auto-filled by the system.
- Each row MUST have a _errors array. Only add to _errors for genuinely missing/unparseable required fields.
- If a row is a section header, subtotal, or blank — skip it (do not include it in any group).

Return ONLY valid JSON (no markdown, no explanation):
{
  "expenses": {
    "column_mapping": { "original header": "mapped field" },
    "rows": [{ "_row": 1, "_errors": [], "branch_name": "...", "date": "...", "period_start": "...", "period_end": "...", "category": "...", "description": "...", "amount": 0, "payment_method": "CASH" }]
  },
  "milk": {
    "column_mapping": {},
    "rows": [{ "_row": 2, "_errors": [], "branch_name": "...", "date": "...", "period_end": "...", "liters": 0, "cost_per_liter": 0 }]
  },
  "sales": {
    "column_mapping": {},
    "rows": [{ "_row": 3, "_errors": [], "branch_name": "...", "date": "...", "period_end": "...", "liters_sold": 0, "price_per_liter": 0, "revenue": 0 }]
  }
}

If a type has no rows in the CSV, return an empty rows array for it.`;

    const aiResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
      body: JSON.stringify({
        model: "minimaxai/minimax-m2.7",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Parse this mixed CSV:\n\n${csvSample}` }],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("NVIDIA AI error:", text);
      return NextResponse.json({ error: "AI parsing service unavailable." }, { status: 502 });
    }

    const aiData = await aiResponse.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";
    const jsonStr = rawContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let parsed: {
      expenses?: { column_mapping: Record<string, string>; rows: ParsedRow[] };
      milk?: { column_mapping: Record<string, string>; rows: ParsedRow[] };
      sales?: { column_mapping: Record<string, string>; rows: ParsedRow[] };
    };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("AI returned non-JSON:", rawContent.slice(0, 500));
      return NextResponse.json({ error: "AI could not parse the CSV. Please check the file format." }, { status: 422 });
    }

    const expenseRows = normaliseRows(parsed.expenses?.rows ?? []);
    const milkRows = normaliseRows(parsed.milk?.rows ?? []);
    const salesRows = normaliseRows(parsed.sales?.rows ?? []);
    const allRows = [...expenseRows, ...milkRows, ...salesRows];

    const preview: AutoImportPreview = {
      type: "auto",
      groups: {
        expenses: { rows: expenseRows, columnMapping: parsed.expenses?.column_mapping ?? {} },
        milk: { rows: milkRows, columnMapping: parsed.milk?.column_mapping ?? {} },
        sales: { rows: salesRows, columnMapping: parsed.sales?.column_mapping ?? {} },
      },
      totalRows: allRows.length + (truncated ? csvLines.length - 301 : 0),
      errorRows: allRows.filter((r) => r._errors.length > 0).length,
    };

    return NextResponse.json(preview);
  }

  // Single-type parse
  const singleSchemaHints: Record<Exclude<ImportType, "auto">, string> = {
    expenses: schemaHints.expenses,
    milk: schemaHints.milk,
    sales: schemaHints.sales,
  };

  const systemPrompt = `You are a CSV parsing assistant for a dairy cooperative. Parse the uploaded CSV and map its columns to the required schema fields. The data may be a bimonthly period summary per branch.

${singleSchemaHints[type as Exclude<ImportType, "auto">]}

Rules:
- Map column headers to field names even if they differ (e.g. "Branch" → branch_name, "UGX Amount" → amount, "Qty Litres" → liters).
- Normalise dates to YYYY-MM-DD. If only a period range is given (e.g. "Apr 1-15"), set period_start to the first date and period_end / date to the last date.
- Strip currency symbols and commas from numbers.
- Match branch names case-insensitively to: ${branchNames}.
- Do NOT require supplier_name for milk rows — supplier is auto-filled.
- Each row must have a _errors array listing only genuinely missing/unparseable required fields.
- Skip section headers, subtotals, and blank rows entirely.
- Do NOT invent data.

Return ONLY valid JSON (no markdown):
{
  "column_mapping": { "original header": "mapped field name" },
  "rows": [{ "_row": 1, "_errors": [], "branch_name": "...", "date": "...", "period_start": "...", "period_end": "..." }]
}`;

  const aiResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model: "minimaxai/minimax-m2.7",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Parse this CSV (${type}):\n\n${csvSample}` }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!aiResponse.ok) {
    const text = await aiResponse.text();
    console.error("NVIDIA AI error:", text);
    return NextResponse.json({ error: "AI parsing service unavailable." }, { status: 502 });
  }

  const aiData = await aiResponse.json();
  const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";
  const jsonStr = rawContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  let parsed: { column_mapping: Record<string, string>; rows: ParsedRow[] };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("AI returned non-JSON:", rawContent.slice(0, 500));
    return NextResponse.json({ error: "AI could not parse the CSV. Please check the file format." }, { status: 422 });
  }

  const rows = normaliseRows(parsed.rows ?? []);
  const preview: ImportPreview = {
    type: type as Exclude<ImportType, "auto">,
    rows,
    totalRows: rows.length + (truncated ? csvLines.length - 301 : 0),
    errorRows: rows.filter((r) => r._errors.length > 0).length,
    columnMapping: parsed.column_mapping ?? {},
  };

  return NextResponse.json(preview);
}
