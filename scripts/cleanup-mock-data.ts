import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...\n");

  console.log("Step 1: Clearing transaction data (child tables)...");
  await prisma.auditLog.deleteMany();
  console.log("  - Cleared AuditLog");

  await prisma.notification.deleteMany();
  console.log("  - Cleared Notification");

  await prisma.stockSnapshot.deleteMany();
  console.log("  - Cleared StockSnapshot");

  await prisma.profitDistribution.deleteMany();
  console.log("  - Cleared ProfitDistribution");

  await prisma.supplierPayment.deleteMany();
  console.log("  - Cleared SupplierPayment");

  await prisma.lactometerReading.deleteMany();
  console.log("  - Cleared LactometerReading");

  await prisma.bankDeposit.deleteMany();
  console.log("  - Cleared BankDeposit");

  await prisma.milkSpoilage.deleteMany();
  console.log("  - Cleared MilkSpoilage");

  await prisma.milkTransfer.deleteMany();
  console.log("  - Cleared MilkTransfer");

  await prisma.advance.deleteMany();
  console.log("  - Cleared Advance");

  await prisma.expense.deleteMany();
  console.log("  - Cleared Expense");

  await prisma.sale.deleteMany();
  console.log("  - Cleared Sale");

  await prisma.milkSupply.deleteMany();
  console.log("  - Cleared MilkSupply");

  await prisma.branchManager.deleteMany();
  console.log("  - Cleared BranchManager");

  console.log("\nStep 2: Clearing suppliers...");
  await prisma.supplier.deleteMany();
  console.log("  - Cleared all suppliers");

  console.log("\nStep 3: Clearing branches...");
  await prisma.branch.deleteMany();
  console.log("  - Cleared all branches");

  console.log("\nStep 4: Clearing non-ED users...");
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      phone: {
        not: "0700000001",
      },
    },
  });
  console.log(`  - Deleted ${deletedUsers.count} user(s) (kept ED: 0700000001)`);

  console.log("\nStep 5: Verifying remaining data...");
  const remainingUsers = await prisma.user.findMany();
  console.log(`  - Users remaining: ${remainingUsers.length}`);
  for (const user of remainingUsers) {
    console.log(`    - ${user.role}: ${user.phone} (${user.fullName})`);
  }

  const settings = await prisma.systemSettings.findFirst();
  console.log(`  - SystemSettings: ${settings?.organizationName ?? "not set"}`);

  const branches = await prisma.branch.count();
  console.log(`  - Branches: ${branches}`);

  const suppliers = await prisma.supplier.count();
  console.log(`  - Suppliers: ${suppliers}`);

  console.log("\n✅ Database cleanup complete!");
  console.log("ED account preserved: 0700000001 / Admin@1234");
  console.log("SystemSettings preserved for ED to configure");
}

main()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });