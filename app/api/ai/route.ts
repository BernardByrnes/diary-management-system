import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActiveUserOrError } from "@/lib/utils/session";

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const { message, history, startDate, endDate } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  // --- Resolve branch scope ---
  let branchIds: string[] = [];
  if (user.role === "MANAGER") {
    const assignments = await prisma.branchManager.findMany({
      where: { managerId: user.id },
      select: { branchId: true },
    });
    branchIds = assignments.map((a) => a.branchId);
  } else if (user.role === "OWNER") {
    const owned = await prisma.branch.findMany({
      where: { ownerId: user.id, isActive: true },
      select: { id: true },
    });
    branchIds = owned.map((b) => b.id);
  }

  const isED = user.role === "EXECUTIVE_DIRECTOR";
  const branchFilter = isED ? {} : { branchId: { in: branchIds } };

  // --- Fetch context data ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : undefined;
  const periodLabel = startDate && endDate
    ? `${startDate} to ${endDate}`
    : startDate
    ? `from ${startDate}`
    : `this month (${today.toLocaleString("en-UG", { month: "long", year: "numeric" })})`;

  const [
    branches,
    recentMilk,
    recentSales,
    recentExpenses,
    pendingTransfers,
    latestSnapshots,
    suppliers,
  ] = await Promise.all([
    prisma.branch.findMany({
      where: isED ? { isActive: true } : { id: { in: branchIds }, isActive: true },
      select: { name: true, location: true },
    }),
    prisma.milkSupply.findMany({
      where: { ...branchFilter, date: { gte: monthStart, ...(periodEnd && { lte: periodEnd }) } },
      select: { date: true, liters: true, costPerLiter: true, totalCost: true, branch: { select: { name: true } }, supplier: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.sale.findMany({
      where: { ...branchFilter, date: { gte: monthStart, ...(periodEnd && { lte: periodEnd }) } },
      select: { date: true, revenue: true, litersSold: true, branch: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.expense.findMany({
      where: { ...branchFilter, date: { gte: monthStart, ...(periodEnd && { lte: periodEnd }) } },
      select: { date: true, amount: true, category: true, description: true, branch: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 30,
    }),
    isED
      ? prisma.milkTransfer.findMany({
          where: { status: "PENDING" },
          select: { sourceBranch: { select: { name: true } }, destinationBranch: { select: { name: true } }, liters: true, createdAt: true },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.stockSnapshot.findMany({
      where: { ...branchFilter },
      select: { branch: { select: { name: true } }, physicalLiters: true, computedLiters: true, varianceLiters: true, date: true, status: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.supplier.findMany({
      where: isED ? {} : { milkSupplies: { some: { branchId: { in: branchIds } } } },
      select: { name: true },
      take: 20,
    }),
  ]);

  // --- Aggregate summaries ---
  const totalMilkMonth = recentMilk.reduce((s, r) => s + Number(r.liters), 0);
  const totalMilkCostMonth = recentMilk.reduce((s, r) => s + Number(r.totalCost), 0);
  const totalRevenueMonth = recentSales.reduce((s, r) => s + Number(r.revenue), 0);
  const totalExpensesMonth = recentExpenses.reduce((s, r) => s + Number(r.amount), 0);
  const totalCostMonth = totalMilkCostMonth + totalExpensesMonth;

  const milkByBranch = recentMilk.reduce<Record<string, number>>((acc, r) => {
    const name = r.branch.name;
    acc[name] = (acc[name] ?? 0) + Number(r.liters);
    return acc;
  }, {});

  const milkCostByBranch = recentMilk.reduce<Record<string, number>>((acc, r) => {
    const name = r.branch.name;
    acc[name] = (acc[name] ?? 0) + Number(r.totalCost);
    return acc;
  }, {});

  const revenueByBranch = recentSales.reduce<Record<string, number>>((acc, r) => {
    const name = r.branch.name;
    acc[name] = (acc[name] ?? 0) + Number(r.revenue);
    return acc;
  }, {});

  const expenseByCategory = recentExpenses.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  const today2 = new Date();
  today2.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today2);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const milkToday = recentMilk
    .filter((r) => new Date(r.date) >= today2 && new Date(r.date) < tomorrow)
    .reduce((s, r) => s + Number(r.liters), 0);

  // --- Build system prompt ---
  const systemPrompt = `You are an AI assistant for Bwera Cooperative Dairy Management System. You help ${user.fullName} (${user.role.replace("_", " ")}) understand and manage dairy operations.

Today's date: ${new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

=== LIVE BUSINESS DATA ===

BRANCHES (${branches.length} active):
${branches.map((b) => `- ${b.name}${b.location ? ` (${b.location})` : ""}`).join("\n")}

MILK DELIVERIES (${periodLabel}) — ${recentMilk.length} records:
- Total: ${totalMilkMonth.toFixed(1)} liters
- Total milk purchase cost: UGX ${totalMilkCostMonth.toLocaleString()}
- Today so far: ${milkToday.toFixed(1)} liters
- By branch (liters): ${Object.entries(milkByBranch).map(([k, v]) => `${k}: ${v.toFixed(1)}L`).join(", ")}
- By branch (purchase cost): ${Object.entries(milkCostByBranch).map(([k, v]) => `${k}: UGX ${v.toLocaleString()}`).join(", ")}
- Individual records:
${recentMilk.slice(0, 50).map((r) => `  • ${new Date(r.date).toLocaleDateString("en-UG")} | ${r.branch.name} | ${r.supplier.name} | ${Number(r.liters).toFixed(1)}L | cost UGX ${Number(r.totalCost).toLocaleString()}`).join("\n")}

SALES (${periodLabel}) — ${recentSales.length} records:
- Total revenue: UGX ${totalRevenueMonth.toLocaleString()}
- By branch: ${Object.entries(revenueByBranch).map(([k, v]) => `${k}: UGX ${v.toLocaleString()}`).join(", ")}
- Individual records:
${recentSales.slice(0, 30).map((r) => `  • ${new Date(r.date).toLocaleDateString("en-UG")} | ${r.branch.name} | ${Number(r.litersSold).toFixed(1)}L | UGX ${Number(r.revenue).toLocaleString()}`).join("\n")}

EXPENSES (${periodLabel}) — ${recentExpenses.length} records:
- Total: UGX ${totalExpensesMonth.toLocaleString()}
- By category: ${Object.entries(expenseByCategory).map(([k, v]) => `${k}: UGX ${v.toLocaleString()}`).join(", ")}
- Individual records:
${recentExpenses.slice(0, 20).map((r) => `  • ${new Date(r.date).toLocaleDateString("en-UG")} | ${r.branch.name} | ${r.category} | UGX ${Number(r.amount).toLocaleString()}${r.description ? ` — ${r.description}` : ""}`).join("\n")}

PROFIT (${periodLabel}):
- Revenue: UGX ${totalRevenueMonth.toLocaleString()}
- Milk purchase cost: UGX ${totalMilkCostMonth.toLocaleString()}
- Other expenses: UGX ${totalExpensesMonth.toLocaleString()}
- Total costs: UGX ${totalCostMonth.toLocaleString()}
- Net profit: UGX ${(totalRevenueMonth - totalCostMonth).toLocaleString()}
- Per branch net profit: ${Object.entries(revenueByBranch).map(([k, v]) => `${k}: UGX ${(v - (milkCostByBranch[k] ?? 0) - (Object.entries(expenseByCategory).reduce((s, [, ev]) => s + ev, 0) / Math.max(Object.keys(revenueByBranch).length, 1))).toLocaleString()}`).join(", ")}

${pendingTransfers.length > 0 ? `PENDING TRANSFERS: ${pendingTransfers.length} transfer(s) awaiting approval` : ""}

RECENT STOCK SNAPSHOTS:
${latestSnapshots.slice(0, 5).map((s) => `- ${s.branch.name}: physical ${Number(s.physicalLiters).toFixed(1)}L, computed ${Number(s.computedLiters).toFixed(1)}L, variance ${Number(s.varianceLiters).toFixed(1)}L (${s.status})`).join("\n")}

SUPPLIERS (${suppliers.length}):
${suppliers.map((s) => `- ${s.name}`).join("\n")}

=== INSTRUCTIONS ===
- Answer questions about the dairy's operations using the data above.
- Be concise and use Uganda Shillings (UGX) for currency.
- If asked something outside your data, say so honestly.
- Format numbers clearly. Use bullet points for lists.`;

  // --- Call NVIDIA API ---
  const messages = [
    ...(history ?? []),
    { role: "user", content: message },
  ];

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "minimaxai/minimax-m2.5",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("NVIDIA API error:", text);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  console.log("NVIDIA response:", JSON.stringify(data).slice(0, 500));
  const reply = data.choices?.[0]?.message?.content ?? "No response.";

  return NextResponse.json({ reply });
}
