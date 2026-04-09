"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search, Plus, FileText, RefreshCw, TrendingUp, TrendingDown, Calculator, CalendarRange,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface DistributionRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: string;
  totalMilkCosts: string;
  totalExpenses: string;
  grossProfit: string;
  advanceDeductions: string;
  netPayout: string;
  status: "CALCULATED" | "APPROVED" | "PAID";
  approvedAt: string | null;
  branch: { id: string; name: string };
  owner: { id: string; fullName: string };
  createdAt: string;
}

interface BranchSummary {
  id: string;
  name: string;
  revenue: number;
  milkCosts: number;
  expenses: number;
  profit: number;
}

interface Props {
  initialRecords: DistributionRecord[];
  branchOptions: { id: string; name: string; ownerId: string }[];
  ownerOptions: { id: string; fullName: string }[];
  branchSummaries: BranchSummary[];
  monthLabel: string;
  startDate: string;
  endDate: string;
}

const distributionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  ownerId: z.string().min(1, "Owner is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  totalRevenue: z.number().min(0),
  totalMilkCosts: z.number().min(0),
  totalExpenses: z.number().min(0),
  advanceDeductions: z.number().min(0),
});

type DistributionInput = z.infer<typeof distributionSchema>;

let toastCounter = 0;

function fmt(n: number) {
  return `UGX ${n.toLocaleString()}`;
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function serialize(json: Record<string, unknown>): DistributionRecord {
  return {
    id: json.id as string,
    periodStart: json.periodStart as string,
    periodEnd: json.periodEnd as string,
    totalRevenue: String(json.totalRevenue),
    totalMilkCosts: String(json.totalMilkCosts),
    totalExpenses: String(json.totalExpenses),
    grossProfit: String(json.grossProfit),
    advanceDeductions: String(json.advanceDeductions),
    netPayout: String(json.netPayout),
    status: json.status as DistributionRecord["status"],
    approvedAt: (json.approvedAt as string) ?? null,
    branch: json.branch as { id: string; name: string },
    owner: json.owner as { id: string; fullName: string },
    createdAt: json.createdAt as string,
  };
}

export default function DistributionsClient({
  initialRecords,
  branchOptions,
  ownerOptions,
  branchSummaries,
  monthLabel,
  startDate,
  endDate,
}: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<DistributionRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState(startDate);
  const [dateTo, setDateTo] = useState(endDate);

  function applyDateRange() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("startDate", dateFrom);
    if (dateTo) params.set("endDate", dateTo);
    router.push(`/dashboard/distributions?${params.toString()}`);
  }

  function clearDateRange() {
    setDateFrom("");
    setDateTo("");
    router.push("/dashboard/distributions");
  }

  useEffect(() => { setRecords(initialRecords); }, [initialRecords]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1200);
  }, [router]);

  const filtered = records.filter(
    (r) =>
      r.branch.name.toLowerCase().includes(search.toLowerCase()) ||
      r.owner.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const csvRows = filtered.map((r) => ({
    branch: r.branch.name,
    owner: r.owner.fullName,
    periodStart: new Date(r.periodStart).toLocaleDateString(),
    periodEnd: new Date(r.periodEnd).toLocaleDateString(),
    revenue: r.totalRevenue,
    milkCosts: r.totalMilkCosts,
    expenses: r.totalExpenses,
    grossProfit: r.grossProfit,
    advances: r.advanceDeductions,
    netPayout: r.netPayout,
  }));

  const csvColumns = [
    { key: "branch" as const, label: "Branch" },
    { key: "owner" as const, label: "Owner" },
    { key: "periodStart" as const, label: "Period Start" },
    { key: "periodEnd" as const, label: "Period End" },
    { key: "revenue" as const, label: "Revenue (UGX)" },
    { key: "milkCosts" as const, label: "Milk Costs (UGX)" },
    { key: "expenses" as const, label: "Expenses (UGX)" },
    { key: "grossProfit" as const, label: "Gross Profit (UGX)" },
    { key: "advances" as const, label: "Advances Deducted (UGX)" },
    { key: "netPayout" as const, label: "Net Payout (UGX)" },
  ];

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-8">

        {/* ── Date Range Picker ─────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <CalendarRange className="w-4 h-4 text-violet-600" />
              <span>Date Range</span>
            </div>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <button
                onClick={applyDateRange}
                disabled={!dateFrom || !dateTo}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                Apply
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={clearDateRange}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Branch P&L Cards ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Branch Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">{monthLabel} — month to date</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Record Distribution
              </button>
            </div>
          </div>

          {branchSummaries.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-400">No branch data for {monthLabel}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchSummaries.map((b) => {
                const isProfit = b.profit >= 0;
                return (
                  <div
                    key={b.id}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-gray-900">{b.name}</p>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          isProfit
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isProfit ? "Profit" : "Loss"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenue</span>
                        <span className="font-mono text-gray-700">{fmt(b.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Milk costs</span>
                        <span className="font-mono text-gray-500">− {fmt(b.milkCosts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expenses</span>
                        <span className="font-mono text-gray-500">− {fmt(b.expenses)}</span>
                      </div>
                      <div className="border-t border-gray-100 pt-1.5 flex justify-between">
                        <span className="font-semibold text-gray-800">Net profit</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isProfit ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {isProfit ? "" : "− "}{fmt(Math.abs(b.profit))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── History Table ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Distribution History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {records.length} distribution{records.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Branch or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 w-44"
                />
              </div>
              <button
                onClick={() => downloadCSV("distributions.csv", generateCSV(csvColumns, csvRows))}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                title="Export CSV"
              >
                <FileText className="w-4 h-4 text-violet-700" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <PdfButton
                title="Profit Distributions"
                filename="distributions.pdf"
                columns={csvColumns}
                rows={csvRows}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Branch</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">Owner</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Period</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Revenue</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Gross Profit</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Net Payout</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      {search ? "No distributions match your search" : "No distributions recorded yet"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const profit = safeNum(r.grossProfit);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{r.branch.name}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-sm hidden sm:table-cell">{r.owner.fullName}</td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-600 hidden lg:table-cell">
                          {fmt(safeNum(r.totalRevenue))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs hidden lg:table-cell">
                          <span className={profit < 0 ? "text-red-600" : "text-gray-700"}>
                            {profit < 0 ? "− " : ""}{fmt(Math.abs(profit))}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 text-xs">
                          {fmt(safeNum(r.netPayout))}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs hidden sm:table-cell">
                          {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {records.length > 0 && (
            <p className="text-xs text-gray-400 px-1 mt-1.5">
              Showing {filtered.length} of {records.length}
            </p>
          )}
        </div>
      </div>

      <DistributionFormModal
        open={addOpen}
        branchOptions={branchOptions}
        ownerOptions={ownerOptions}
        onClose={() => setAddOpen(false)}
        onSuccess={(d) => {
          setRecords((prev) => [d, ...prev]);
          setAddOpen(false);
          addToast("success", `Distribution recorded — ${fmt(safeNum(d.netPayout))} to ${d.owner.fullName}`);
        }}
        onError={(msg) => addToast("error", msg)}
      />
    </>
  );
}

// ─── Form Modal ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400";

function DistributionFormModal({
  open,
  branchOptions,
  ownerOptions,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  branchOptions: { id: string; name: string; ownerId: string }[];
  ownerOptions: { id: string; fullName: string }[];
  onClose: () => void;
  onSuccess: (record: DistributionRecord) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DistributionInput>({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      totalRevenue: 0,
      totalMilkCosts: 0,
      totalExpenses: 0,
      advanceDeductions: 0,
    },
  });

  const [calculating, setCalculating] = useState(false);
  const [calcDone, setCalcDone] = useState(false);
  const [advanceCount, setAdvanceCount] = useState(0);

  // Auto-fill owner when branch is selected
  const selectedBranchId = watch("branchId");
  useEffect(() => {
    if (!selectedBranchId) return;
    const branch = branchOptions.find((b) => b.id === selectedBranchId);
    if (branch) setValue("ownerId", branch.ownerId, { shouldValidate: true });
  }, [selectedBranchId, branchOptions, setValue]);

  const totalRevenue = watch("totalRevenue") || 0;
  const totalMilkCosts = watch("totalMilkCosts") || 0;
  const totalExpenses = watch("totalExpenses") || 0;
  const advanceDeductions = watch("advanceDeductions") || 0;
  const grossProfit = totalRevenue - totalMilkCosts - totalExpenses;
  const netPayout = Math.max(0, grossProfit - advanceDeductions);

  async function handleCalculate() {
    const { branchId, ownerId, periodStart, periodEnd } = getValues();
    if (!branchId || !ownerId || !periodStart || !periodEnd) {
      onError("Select branch, owner and both period dates before calculating.");
      return;
    }
    setCalculating(true);
    setCalcDone(false);
    try {
      const params = new URLSearchParams({ branchId, ownerId, periodStart, periodEnd });
      const res = await fetch(`/api/distributions/calculate?${params}`);
      const data = await res.json();
      if (!res.ok) { onError(data.error ?? "Calculation failed"); return; }
      setValue("totalRevenue", data.totalRevenue, { shouldValidate: true });
      setValue("totalMilkCosts", data.totalMilkCosts, { shouldValidate: true });
      setValue("totalExpenses", data.totalExpenses, { shouldValidate: true });
      setValue("advanceDeductions", data.advanceDeductions, { shouldValidate: true });
      setAdvanceCount(data.advanceCount);
      setCalcDone(true);
    } finally {
      setCalculating(false);
    }
  }

  const onSubmit = async (data: DistributionInput) => {
    const res = await fetch("/api/distributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      setCalcDone(false);
      onSuccess(serialize(json));
    }
  };

  function handleClose() {
    reset();
    setCalcDone(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Record Distribution">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Branch + Owner */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
            <select {...register("branchId")} className={inputClass}>
              <option value="">Select branch</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
            {selectedBranchId ? (
              <div className={`${inputClass} bg-gray-50 text-gray-500 cursor-default`}>
                {ownerOptions.find(
                  (o) => o.id === branchOptions.find((b) => b.id === selectedBranchId)?.ownerId
                )?.fullName ?? "—"}
                <input type="hidden" {...register("ownerId")} />
              </div>
            ) : (
              <select {...register("ownerId")} className={inputClass}>
                <option value="">Select branch first</option>
              </select>
            )}
            {errors.ownerId && <p className="mt-1 text-xs text-red-500">{errors.ownerId.message}</p>}
          </div>
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Period Start</label>
            <input type="date" {...register("periodStart")} className={inputClass} />
            {errors.periodStart && <p className="mt-1 text-xs text-red-500">{errors.periodStart.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Period End</label>
            <input type="date" {...register("periodEnd")} className={inputClass} />
            {errors.periodEnd && <p className="mt-1 text-xs text-red-500">{errors.periodEnd.message}</p>}
          </div>
        </div>

        {/* Auto-calculate button */}
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors disabled:opacity-60"
        >
          <Calculator className="w-4 h-4" />
          {calculating ? "Calculating…" : "Auto-calculate from records"}
        </button>

        {calcDone && (
          <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2">
            Filled from actual records · {advanceCount} outstanding advance{advanceCount !== 1 ? "s" : ""} deducted
          </p>
        )}

        {/* Figures — editable so the ED can override if needed */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Revenue (UGX)</label>
            <input type="number" step="1" min="0" {...register("totalRevenue", { valueAsNumber: true })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Milk Costs (UGX)</label>
            <input type="number" step="1" min="0" {...register("totalMilkCosts", { valueAsNumber: true })} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Expenses (UGX)</label>
            <input type="number" step="1" min="0" {...register("totalExpenses", { valueAsNumber: true })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Advance Deductions (UGX)</label>
            <input type="number" step="1" min="0" {...register("advanceDeductions", { valueAsNumber: true })} className={inputClass} />
          </div>
        </div>

        {/* Live P&L preview */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Revenue</span>
            <span className="font-mono text-gray-700">{fmt(totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Milk costs</span>
            <span className="font-mono text-gray-500">− {fmt(totalMilkCosts)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Expenses</span>
            <span className="font-mono text-gray-500">− {fmt(totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1.5">
            <span className="text-gray-600 font-medium">Gross profit</span>
            <span className={`font-mono font-medium ${grossProfit < 0 ? "text-red-600" : "text-gray-800"}`}>
              {grossProfit < 0 ? "− " : ""}{fmt(Math.abs(grossProfit))}
            </span>
          </div>
          {advanceDeductions > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Advance deductions</span>
              <span className="font-mono text-amber-600">− {fmt(advanceDeductions)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1.5">
            <span className="font-semibold text-gray-800 text-sm">Net payout</span>
            <span className="font-mono font-bold text-violet-700 text-sm">{fmt(netPayout)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {isSubmitting ? "Recording..." : "Record & Pay"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
