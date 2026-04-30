import { NextRequest, NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/utils/audit";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

export type AiTool =
  | "add_expense"
  | "record_milk_delivery"
  | "record_sale"
  | "record_bank_deposit"
  | "record_advance";

export interface ExecuteResult {
  success: boolean;
  message: string;
}

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Only the Executive Director can execute AI write actions." }, { status: 403 });
  }

  const { tool, args } = (await req.json()) as { tool: AiTool; args: Record<string, unknown> };

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const branchByName = Object.fromEntries(branches.map((b) => [b.name.toLowerCase().trim(), b.id]));

  function resolveBranch(name: string): string | null {
    return branchByName[String(name).toLowerCase().trim()] ?? null;
  }

  try {
    if (tool === "add_expense") {
      const branchId = resolveBranch(args.branch_name as string);
      if (!branchId) return NextResponse.json({ error: `Branch "${args.branch_name}" not found.` }, { status: 400 });

      const expense = await prisma.expense.create({
        data: {
          date: new Date(args.date as string),
          branchId,
          category: args.category as ExpenseCategory,
          description: args.description as string,
          amount: Number(args.amount),
          paymentMethod: ((args.payment_method as string) || "CASH") as PaymentMethod,
          receiptReference: (args.receipt_reference as string) || null,
          periodStart: args.period_start ? new Date(args.period_start as string) : new Date(args.date as string),
          periodEnd: args.period_end ? new Date(args.period_end as string) : new Date(args.date as string),
          recordedById: user.id,
        },
      });
      await createAuditLog({ userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id, changes: { source: "ai_write_action" } });
      return NextResponse.json({ success: true, message: `Expense of UGX ${Number(args.amount).toLocaleString()} recorded for ${args.branch_name}.` });
    }

    if (tool === "record_milk_delivery") {
      const branchId = resolveBranch(args.branch_name as string);
      if (!branchId) return NextResponse.json({ error: `Branch "${args.branch_name}" not found.` }, { status: 400 });

      const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
      const supplierByName = Object.fromEntries(suppliers.map((s) => [s.name.toLowerCase().trim(), s.id]));
      const supplierId = supplierByName[String(args.supplier_name).toLowerCase().trim()];
      if (!supplierId) return NextResponse.json({ error: `Supplier "${args.supplier_name}" not found.` }, { status: 400 });

      const liters = Number(args.liters);
      const costPerLiter = Number(args.cost_per_liter);
      const supply = await prisma.milkSupply.create({
        data: {
          date: new Date(args.date as string),
          branchId,
          supplierId,
          liters,
          costPerLiter,
          totalCost: liters * costPerLiter,
          retailPricePerLiter: Number(args.retail_price_per_liter ?? args.cost_per_liter),
          deliveryReference: (args.delivery_reference as string) || null,
          recordedById: user.id,
        },
      });
      await createAuditLog({ userId: user.id, action: "CREATE", entityType: "MilkSupply", entityId: supply.id, changes: { source: "ai_write_action" } });
      return NextResponse.json({ success: true, message: `${liters}L milk delivery from ${args.supplier_name} to ${args.branch_name} recorded.` });
    }

    if (tool === "record_sale") {
      const branchId = resolveBranch(args.branch_name as string);
      if (!branchId) return NextResponse.json({ error: `Branch "${args.branch_name}" not found.` }, { status: 400 });

      const litersSold = Number(args.liters_sold);
      const pricePerLiter = Number(args.price_per_liter);
      const sale = await prisma.sale.create({
        data: {
          date: new Date(args.date as string),
          branchId,
          litersSold,
          pricePerLiter,
          revenue: litersSold * pricePerLiter,
          recordedById: user.id,
        },
      });
      await createAuditLog({ userId: user.id, action: "CREATE", entityType: "Sale", entityId: sale.id, changes: { source: "ai_write_action" } });
      return NextResponse.json({ success: true, message: `Sale of ${litersSold}L for UGX ${(litersSold * pricePerLiter).toLocaleString()} recorded for ${args.branch_name}.` });
    }

    if (tool === "record_bank_deposit") {
      const branchId = resolveBranch(args.branch_name as string);
      if (!branchId) return NextResponse.json({ error: `Branch "${args.branch_name}" not found.` }, { status: 400 });

      const deposit = await prisma.bankDeposit.create({
        data: {
          date: new Date(args.date as string),
          branchId,
          amount: Number(args.amount),
          bankName: args.bank_name as string,
          referenceNumber: args.reference_number as string,
          recordedById: user.id,
        },
      });
      await createAuditLog({ userId: user.id, action: "CREATE", entityType: "BankDeposit", entityId: deposit.id, changes: { source: "ai_write_action" } });
      return NextResponse.json({ success: true, message: `Bank deposit of UGX ${Number(args.amount).toLocaleString()} to ${args.bank_name} recorded (Ref: ${args.reference_number}).` });
    }

    if (tool === "record_advance") {
      const branchId = args.branch_name ? resolveBranch(args.branch_name as string) : null;

      let supplierId: string | null = null;
      if (args.supplier_name) {
        const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
        const supplierByName = Object.fromEntries(suppliers.map((s) => [s.name.toLowerCase().trim(), s.id]));
        supplierId = supplierByName[String(args.supplier_name).toLowerCase().trim()] ?? null;
      }

      const advance = await prisma.advance.create({
        data: {
          date: new Date(args.date as string),
          amount: Number(args.amount),
          purpose: args.purpose as string,
          recipientType: supplierId ? "SUPPLIER" : "OWNER",
          supplierId,
          branchId,
          recordedById: user.id,
        },
      });
      await createAuditLog({ userId: user.id, action: "CREATE", entityType: "Advance", entityId: advance.id, changes: { source: "ai_write_action" } });
      return NextResponse.json({ success: true, message: `Advance of UGX ${Number(args.amount).toLocaleString()} recorded for ${args.supplier_name ?? args.branch_name}.` });
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (err) {
    console.error("AI execute error:", err);
    return NextResponse.json({ error: "Failed to save record. Please try again." }, { status: 500 });
  }
}
