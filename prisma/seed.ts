import { PrismaClient, ExpenseCategory, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function daysAgoAt(n: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  const defaultHash = await bcrypt.hash("Admin@1234", 10);
  const tempHash = await bcrypt.hash("Temp@1234", 10);

  // ── Users ─────────────────────────────────────────────────────────────────
  const director = await prisma.user.upsert({
    where: { phone: "0700000001" },
    update: {},
    create: {
      fullName: "Executive Director",
      phone: "0700000001",
      password: defaultHash,
      role: "EXECUTIVE_DIRECTOR",
      mustChangePassword: false,
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { phone: "0700000002" },
    update: {},
    create: {
      fullName: "James Mugisha",
      phone: "0700000002",
      password: tempHash,
      role: "OWNER",
      mustChangePassword: false,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { phone: "0700000003" },
    update: {},
    create: {
      fullName: "Sarah Namukasa",
      phone: "0700000003",
      password: tempHash,
      role: "OWNER",
      mustChangePassword: false,
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { phone: "0700000004" },
    update: {},
    create: {
      fullName: "Peter Okello",
      phone: "0700000004",
      password: tempHash,
      role: "MANAGER",
      mustChangePassword: false,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { phone: "0700000005" },
    update: {},
    create: {
      fullName: "Grace Apio",
      phone: "0700000005",
      password: tempHash,
      role: "MANAGER",
      mustChangePassword: false,
    },
  });

  const manager3 = await prisma.user.upsert({
    where: { phone: "0700000006" },
    update: {},
    create: {
      fullName: "David Kato",
      phone: "0700000006",
      password: tempHash,
      role: "MANAGER",
      mustChangePassword: false,
    },
  });

  // ── Branches ──────────────────────────────────────────────────────────────
  const branch1 = await prisma.branch.upsert({
    where: { name: "Bwera Central" },
    update: {},
    create: {
      name: "Bwera Central",
      location: "Bwera Town, Kasese District",
      ownerId: owner1.id,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { name: "Bwera Kyabugimbi" },
    update: {},
    create: {
      name: "Bwera Kyabugimbi",
      location: "Kyabugimbi, Kasese District",
      ownerId: owner2.id,
    },
  });

  // ── Assign Managers ───────────────────────────────────────────────────────
  await prisma.branchManager.upsert({
    where: { branchId_managerId: { branchId: branch1.id, managerId: manager1.id } },
    update: {},
    create: { branchId: branch1.id, managerId: manager1.id },
  });
  await prisma.branchManager.upsert({
    where: { branchId_managerId: { branchId: branch1.id, managerId: manager2.id } },
    update: {},
    create: { branchId: branch1.id, managerId: manager2.id },
  });
  await prisma.branchManager.upsert({
    where: { branchId_managerId: { branchId: branch2.id, managerId: manager3.id } },
    update: {},
    create: { branchId: branch2.id, managerId: manager3.id },
  });

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplierData = [
    { name: "Amos Bwambale", phone: "0701000001", location: "Kitswamba" },
    { name: "Ruth Biira", phone: "0701000002", location: "Bwera" },
    { name: "John Mukirane", phone: "0701000003", location: "Karusandara" },
    { name: "Esther Kyakimwa", phone: "0701000004", location: "Mahango" },
    { name: "Moses Kule", phone: "0701000005", location: "Kyondo" },
  ];

  const suppliers: Awaited<ReturnType<typeof prisma.supplier.upsert>>[] = [];
  for (const s of supplierData) {
    const sup = await prisma.supplier.upsert({
      where: { phone: s.phone },
      update: {},
      create: s,
    });
    suppliers.push(sup);
  }
  const [sup1, sup2, sup3, sup4, sup5] = suppliers;

  // ── Settings singleton ────────────────────────────────────────────────────
  await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // ── 30 Days of Milk Supply ────────────────────────────────────────────────
  // Branch 1: ~180–220L/day from 2–3 suppliers at 1,200–1,300 UGX/L
  // Branch 2: ~120–160L/day from 2 suppliers at 1,150–1,250 UGX/L
  const b1Suppliers = [sup1, sup2, sup3];
  const b2Suppliers = [sup4, sup5];
  const b1Manager = manager1;
  const b2Manager = manager3;

  for (let day = 29; day >= 1; day--) {
    // Branch 1 - morning delivery
    const b1Liters1 = 90 + Math.floor(Math.random() * 30);
    const b1Cost1 = 1200 + Math.floor(Math.random() * 100);
    await prisma.milkSupply.create({
      data: {
        date: daysAgoAt(day, 7),
        liters: b1Liters1,
        costPerLiter: b1Cost1,
        totalCost: b1Liters1 * b1Cost1,
        retailPricePerLiter: Math.round(b1Cost1 * 1.28 + 80),
        branchId: branch1.id,
        supplierId: b1Suppliers[day % 3].id,
        recordedById: b1Manager.id,
      },
    });
    // Branch 1 - evening delivery
    const b1Liters2 = 70 + Math.floor(Math.random() * 30);
    const b1Cost2 = 1200 + Math.floor(Math.random() * 100);
    await prisma.milkSupply.create({
      data: {
        date: daysAgoAt(day, 17),
        liters: b1Liters2,
        costPerLiter: b1Cost2,
        totalCost: b1Liters2 * b1Cost2,
        retailPricePerLiter: Math.round(b1Cost2 * 1.28 + 80),
        branchId: branch1.id,
        supplierId: b1Suppliers[(day + 1) % 3].id,
        recordedById: b1Manager.id,
      },
    });

    // Branch 2 - single daily delivery
    const b2Liters = 120 + Math.floor(Math.random() * 40);
    const b2Cost = 1150 + Math.floor(Math.random() * 100);
    await prisma.milkSupply.create({
      data: {
        date: daysAgoAt(day, 7),
        liters: b2Liters,
        costPerLiter: b2Cost,
        totalCost: b2Liters * b2Cost,
        retailPricePerLiter: Math.round(b2Cost * 1.28 + 80),
        branchId: branch2.id,
        supplierId: b2Suppliers[day % 2].id,
        recordedById: b2Manager.id,
      },
    });
  }

  // ── 30 Days of Sales ─────────────────────────────────────────────────────
  // Branch 1 sells ~150–190L/day at 1,600–1,800 UGX/L
  // Branch 2 sells ~100–130L/day at 1,550–1,700 UGX/L
  for (let day = 29; day >= 1; day--) {
    const b1Sold = 150 + Math.floor(Math.random() * 40);
    const b1Price = 1600 + Math.floor(Math.random() * 200);
    await prisma.sale.create({
      data: {
        date: daysAgoAt(day, 12),
        litersSold: b1Sold,
        pricePerLiter: b1Price,
        revenue: b1Sold * b1Price,
        branchId: branch1.id,
        recordedById: b1Manager.id,
      },
    });

    const b2Sold = 100 + Math.floor(Math.random() * 30);
    const b2Price = 1550 + Math.floor(Math.random() * 150);
    await prisma.sale.create({
      data: {
        date: daysAgoAt(day, 12),
        litersSold: b2Sold,
        pricePerLiter: b2Price,
        revenue: b2Sold * b2Price,
        branchId: branch2.id,
        recordedById: b2Manager.id,
      },
    });
  }

  // ── Expenses (last 30 days) ───────────────────────────────────────────────
  const expenseCategories: ExpenseCategory[] = [
    "SALARIES", "MEALS", "RENT", "TRANSPORT", "UTILITIES", "MAINTENANCE", "MISCELLANEOUS",
  ];

  // Monthly rent entries
  await prisma.expense.create({
    data: {
      date: daysAgo(28),
      category: "RENT",
      description: "Monthly shop rent — Bwera Central",
      amount: 150000,
      paymentMethod: PaymentMethod.BANK,
      branchId: branch1.id,
      recordedById: manager1.id,
    },
  });
  await prisma.expense.create({
    data: {
      date: daysAgo(28),
      category: "RENT",
      description: "Monthly shop rent — Bwera Kyabugimbi",
      amount: 120000,
      paymentMethod: PaymentMethod.BANK,
      branchId: branch2.id,
      recordedById: manager3.id,
    },
  });

  // Salaries
  await prisma.expense.create({
    data: {
      date: daysAgo(25),
      category: "SALARIES",
      description: "Staff salaries — Bwera Central",
      amount: 450000,
      paymentMethod: PaymentMethod.BANK,
      branchId: branch1.id,
      recordedById: manager1.id,
    },
  });
  await prisma.expense.create({
    data: {
      date: daysAgo(25),
      category: "SALARIES",
      description: "Staff salaries — Kyabugimbi",
      amount: 380000,
      paymentMethod: PaymentMethod.BANK,
      branchId: branch2.id,
      recordedById: manager3.id,
    },
  });

  // Recurring small expenses over the past 30 days
  const smallExpenses: { day: number; cat: ExpenseCategory; desc: string; amt: number; branch: typeof branch1; mgr: typeof manager1 }[] = [
    { day: 27, cat: "MEALS", desc: "Staff refreshments", amt: 15000, branch: branch1, mgr: manager1 },
    { day: 26, cat: "TRANSPORT", desc: "Delivery fuel", amt: 25000, branch: branch1, mgr: manager1 },
    { day: 24, cat: "MEALS", desc: "Staff refreshments", amt: 12000, branch: branch2, mgr: manager3 },
    { day: 23, cat: "TRANSPORT", desc: "Milk collection transport", amt: 20000, branch: branch2, mgr: manager3 },
    { day: 21, cat: "UTILITIES", desc: "Electricity bill", amt: 35000, branch: branch1, mgr: manager1 },
    { day: 20, cat: "MAINTENANCE", desc: "Cooler maintenance", amt: 45000, branch: branch1, mgr: manager1 },
    { day: 18, cat: "MEALS", desc: "Staff lunch", amt: 18000, branch: branch1, mgr: manager2 },
    { day: 17, cat: "TRANSPORT", desc: "Delivery motorcycle fuel", amt: 22000, branch: branch2, mgr: manager3 },
    { day: 15, cat: "UTILITIES", desc: "Water bill", amt: 12000, branch: branch2, mgr: manager3 },
    { day: 14, cat: "MISCELLANEOUS", desc: "Packaging materials", amt: 30000, branch: branch1, mgr: manager1 },
    { day: 12, cat: "MEALS", desc: "Staff refreshments", amt: 14000, branch: branch1, mgr: manager2 },
    { day: 10, cat: "TRANSPORT", desc: "Supplier pickup fuel", amt: 28000, branch: branch2, mgr: manager3 },
    { day: 8, cat: "MAINTENANCE", desc: "Refrigerator repair", amt: 75000, branch: branch2, mgr: manager3 },
    { day: 6, cat: "MEALS", desc: "Staff refreshments", amt: 16000, branch: branch1, mgr: manager1 },
    { day: 4, cat: "MISCELLANEOUS", desc: "Cleaning supplies", amt: 8000, branch: branch2, mgr: manager3 },
    { day: 3, cat: "TRANSPORT", desc: "Delivery fuel", amt: 24000, branch: branch1, mgr: manager1 },
  ];

  for (const e of smallExpenses) {
    await prisma.expense.create({
      data: {
        date: daysAgo(e.day),
        category: e.cat,
        description: e.desc,
        amount: e.amt,
        paymentMethod: PaymentMethod.CASH,
        branchId: e.branch.id,
        recordedById: e.mgr.id,
      },
    });
  }

  // ── Cash Advances ─────────────────────────────────────────────────────────
  // Supplier advance (outstanding)
  await prisma.advance.create({
    data: {
      recipientType: "SUPPLIER",
      supplierId: sup1.id,
      amount: 200000,
      date: daysAgo(20),
      purpose: "Emergency advance — farming input costs",
      isDeducted: false,
      recordedById: director.id,
    },
  });
  // Supplier advance (already deducted)
  await prisma.advance.create({
    data: {
      recipientType: "SUPPLIER",
      supplierId: sup2.id,
      amount: 150000,
      date: daysAgo(35),
      purpose: "Advance against next payment",
      isDeducted: true,
      deductedAt: daysAgo(15),
      recordedById: director.id,
    },
  });
  // Owner advance (outstanding)
  await prisma.advance.create({
    data: {
      recipientType: "OWNER",
      ownerId: owner1.id,
      branchId: branch1.id,
      amount: 300000,
      date: daysAgo(10),
      purpose: "Personal emergency advance",
      isDeducted: false,
      recordedById: director.id,
    },
  });

  // ── Milk Transfer ─────────────────────────────────────────────────────────
  // Approved transfer
  await prisma.milkTransfer.create({
    data: {
      date: daysAgo(15),
      liters: 30,
      costPerLiter: 1250,
      reason: "Branch 2 had excess stock",
      status: "APPROVED",
      sourceBranchId: branch2.id,
      destinationBranchId: branch1.id,
      requestedById: manager3.id,
      approvedById: director.id,
      approvedAt: daysAgo(15),
    },
  });
  // Pending transfer
  await prisma.milkTransfer.create({
    data: {
      date: daysAgo(2),
      liters: 20,
      costPerLiter: 1200,
      reason: "Excess inventory — request to transfer to Kyabugimbi",
      status: "PENDING",
      sourceBranchId: branch1.id,
      destinationBranchId: branch2.id,
      requestedById: manager1.id,
    },
  });
  // Rejected transfer
  await prisma.milkTransfer.create({
    data: {
      date: daysAgo(8),
      liters: 50,
      costPerLiter: 1200,
      reason: "Test transfer",
      status: "REJECTED",
      sourceBranchId: branch1.id,
      destinationBranchId: branch2.id,
      requestedById: manager2.id,
      approvedById: director.id,
      approvedAt: daysAgo(8),
    },
  });

  // ── Bank Deposits ─────────────────────────────────────────────────────────
  for (let day = 28; day >= 1; day -= 3) {
    const b1Amount = 250000 + Math.floor(Math.random() * 100000);
    await prisma.bankDeposit.create({
      data: {
        date: daysAgo(day),
        amount: b1Amount,
        bankName: "Centenary Bank",
        referenceNumber: `CB-${Date.now()}-${day}`,
        branchId: branch1.id,
        recordedById: manager1.id,
        hasDiscrepancy: day === 12,
        discrepancyNote: day === 12 ? "Deposited late — transport delay" : null,
      },
    });

    const b2Amount = 180000 + Math.floor(Math.random() * 80000);
    await prisma.bankDeposit.create({
      data: {
        date: daysAgo(day),
        amount: b2Amount,
        bankName: "Stanbic Bank",
        referenceNumber: `SB-${Date.now() + day}-${day}`,
        branchId: branch2.id,
        recordedById: manager3.id,
        hasDiscrepancy: false,
      },
    });
  }

  // ── Lactometer Readings ───────────────────────────────────────────────────
  for (let day = 28; day >= 1; day -= 2) {
    // Branch 1 - mostly in range, one out of range
    const reading1 = day === 10 ? 1.018 : 1.026 + Math.random() * 0.006;
    await prisma.lactometerReading.create({
      data: {
        date: daysAgoAt(day, 8),
        time: "08:00",
        readingValue: parseFloat(reading1.toFixed(3)),
        notes: day === 10 ? "Unusual reading — possible dilution" : null,
        branchId: branch1.id,
        recordedById: manager1.id,
      },
    });

    // Branch 2 - all in range
    const reading2 = 1.027 + Math.random() * 0.005;
    await prisma.lactometerReading.create({
      data: {
        date: daysAgoAt(day, 8),
        time: "08:15",
        readingValue: parseFloat(reading2.toFixed(3)),
        branchId: branch2.id,
        recordedById: manager3.id,
      },
    });
  }

  // ── Supplier Payments (calculated for last period) ───────────────────────
  const now = new Date();
  const isFirstHalf = now.getDate() <= 15;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), isFirstHalf ? 1 : 16);
  const periodEnd = isFirstHalf
    ? new Date(now.getFullYear(), now.getMonth(), 15)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const sup of [sup1, sup2]) {
    const gross = 800000 + Math.floor(Math.random() * 400000);
    await prisma.supplierPayment.upsert({
      where: {
        supplierId_periodStart_periodEnd: {
          supplierId: sup.id,
          periodStart,
          periodEnd,
        },
      },
      update: {},
      create: {
        supplierId: sup.id,
        periodStart,
        periodEnd,
        grossAmount: gross,
        advanceDeductions: sup.id === sup1.id ? 200000 : 0,
        netAmount: sup.id === sup1.id ? gross - 200000 : gross,
        status: "CALCULATED",
        scheduledDate: isFirstHalf
          ? new Date(now.getFullYear(), now.getMonth(), 15)
          : new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
    });
  }

  // ── Profit Distribution (last month) ─────────────────────────────────────
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  for (const { branch, owner } of [
    { branch: branch1, owner: owner1 },
    { branch: branch2, owner: owner2 },
  ]) {
    const revenue = 6500000 + Math.floor(Math.random() * 1000000);
    const milkCosts = 4200000 + Math.floor(Math.random() * 500000);
    const expenses = 800000 + Math.floor(Math.random() * 200000);
    const grossProfit = revenue - milkCosts - expenses;
    const advDed = branch.id === branch1.id ? 300000 : 0;
    const netPayout = Math.max(0, grossProfit - advDed);

    await prisma.profitDistribution.upsert({
      where: {
        branchId_ownerId_periodStart_periodEnd: {
          branchId: branch.id,
          ownerId: owner.id,
          periodStart: lastMonthStart,
          periodEnd: lastMonthEnd,
        },
      },
      update: {},
      create: {
        branchId: branch.id,
        ownerId: owner.id,
        periodStart: lastMonthStart,
        periodEnd: lastMonthEnd,
        totalRevenue: revenue,
        totalMilkCosts: milkCosts,
        totalExpenses: expenses,
        grossProfit,
        advanceDeductions: advDed,
        netPayout,
        status: "PAID",
        approvedAt: daysAgo(5),
      },
    });
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      type: "TRANSFER_PENDING",
      title: "Milk Transfer Pending Approval",
      message: "Peter Okello has requested a transfer of 20L from Bwera Central to Bwera Kyabugimbi.",
      urgency: "MEDIUM",
      isRead: false,
      userId: director.id,
      relatedEntityType: "transfer",
    },
  });
  await prisma.notification.create({
    data: {
      type: "READING_OUT_OF_RANGE",
      title: "Lactometer Reading Out of Range",
      message: "A reading of 1.018 was recorded at Bwera Central — below the acceptable minimum (1.026).",
      urgency: "HIGH",
      isRead: false,
      userId: director.id,
      relatedEntityType: "lactometer",
    },
  });
  await prisma.notification.create({
    data: {
      type: "BANKING_DISCREPANCY",
      title: "Banking Discrepancy Detected",
      message: "Bwera Central deposit on day 12 shows a discrepancy. Review required.",
      urgency: "HIGH",
      isRead: true,
      userId: director.id,
      relatedEntityType: "bankDeposit",
    },
  });
  await prisma.notification.create({
    data: {
      type: "PAYMENT_DUE",
      title: "Supplier Payments Due",
      message: "Supplier payment calculations are ready for the current period. Please review and approve.",
      urgency: "MEDIUM",
      isRead: false,
      userId: director.id,
      relatedEntityType: "payment",
    },
  });

  // ── Print Credentials ─────────────────────────────────────────────────────
  console.log("✅ Seeding complete!\n");
  console.log("═══════════════════════════════════════════════════");
  console.log("                   CREDENTIALS                    ");
  console.log("═══════════════════════════════════════════════════");
  console.log("EXECUTIVE DIRECTOR:");
  console.log("  Phone:    0700000001");
  console.log("  Password: Admin@1234\n");
  console.log("BRANCH OWNERS:");
  console.log("  James Mugisha  — 0700000002 / Temp@1234");
  console.log("  Sarah Namukasa — 0700000003 / Temp@1234\n");
  console.log("MANAGERS:");
  console.log("  Peter Okello — 0700000004 / Temp@1234");
  console.log("  Grace Apio   — 0700000005 / Temp@1234");
  console.log("  David Kato   — 0700000006 / Temp@1234\n");
  console.log("BRANCHES:");
  console.log("  Bwera Central     → Owner: James Mugisha");
  console.log("  Bwera Kyabugimbi  → Owner: Sarah Namukasa\n");
  console.log("TEST DATA:");
  console.log("  30 days of milk supply, sales, expenses, deposits, readings");
  console.log("  3 transfers (1 approved, 1 pending, 1 rejected)");
  console.log("  3 advances (2 supplier, 1 owner)");
  console.log("  Supplier payments calculated for current period");
  console.log("  Last month profit distributions (PAID status)");
  console.log("  4 notifications in various states");
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
