import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";
import { updateBranchSchema } from "@/lib/validations/branch";
import { createAuditLog } from "@/lib/utils/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const role = user.role;
  if (role !== "EXECUTIVE_DIRECTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { managerIds, ...branchData } = parsed.data;

  // Deactivation guard: warn about blocking dependencies
  if (branchData.isActive === false) {
    const [pendingTransfers, unpaidPayments, pendingDistributions] = await Promise.all([
      prisma.milkTransfer.count({
        where: {
          OR: [{ sourceBranchId: id }, { destinationBranchId: id }],
          status: "PENDING",
        },
      }),
      prisma.supplierPayment.count({
        where: {
          supplier: { milkSupplies: { some: { branchId: id } } },
          status: { in: ["CALCULATED", "APPROVED"] },
        },
      }),
      prisma.profitDistribution.count({
        where: { branchId: id, status: { in: ["CALCULATED", "APPROVED"] } },
      }),
    ]);

    const warnings: string[] = [];
    if (pendingTransfers > 0)
      warnings.push(`${pendingTransfers} pending milk transfer(s)`);
    if (unpaidPayments > 0)
      warnings.push(`${unpaidPayments} unpaid supplier payment(s)`);
    if (pendingDistributions > 0)
      warnings.push(`${pendingDistributions} unsettled profit distribution(s)`);

    if (warnings.length > 0 && !body.forceDeactivate) {
      return NextResponse.json(
        {
          error: `This branch has: ${warnings.join(", ")}. Resolve these before deactivating, or confirm with forceDeactivate=true.`,
          warnings,
          requiresConfirmation: true,
        },
        { status: 409 }
      );
    }
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: branchData,
    include: {
      owner: { select: { id: true, fullName: true, phone: true } },
      managers: {
        include: { manager: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (managerIds !== undefined) {
    await prisma.branchManager.deleteMany({ where: { branchId: id } });
    if (managerIds.length > 0) {
      await prisma.branchManager.createMany({
        data: managerIds.map((managerId) => ({ branchId: id, managerId })),
        skipDuplicates: true,
      });
    }
  }

  await createAuditLog({
    action: "UPDATE",
    entityType: "Branch",
    entityId: id,
    userId: user.id,
    changes: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({
    ...branch,
    createdAt: branch.createdAt.toISOString(),
  });
}
