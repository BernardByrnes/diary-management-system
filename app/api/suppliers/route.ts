import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { supplierSchema } from "@/lib/validations/supplier";
import { createAuditLog } from "@/lib/utils/audit";

export async function GET() {
  const { error } = await getActiveUserOrError();
  if (error) return error;

  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const role = user.role;
  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.supplier.findUnique({
    where: { phone: parsed.data.phone },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A supplier with this phone number already exists" },
      { status: 409 }
    );
  }

  const supplier = await prisma.supplier.create({ data: parsed.data });

  await createAuditLog({
    action: "CREATE",
    entityType: "Supplier",
    entityId: supplier.id,
    userId: user.id,
    changes: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json(supplier, { status: 201 });
}
