"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDate } from "@/lib/utils/date";
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  PackageSearch,
  Pencil,
  Droplet,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";

interface SnapshotRecord {
  id: string;
  date: string;
  branchId: string;
  physicalLiters: string;
  computedLiters: string;
  varianceLiters: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  branch: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  reviewedBy: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface BreakdownData {
  baseSnapshot: { id: string; date: string; physicalLiters: number } | null;
  supplies: Array<{ id: string; date: string; liters: number; supplier: string; deliveryReference: string }>;
  transfersIn: Array<{ id: string; date: string; liters: number; sourceBranch: string }>;
  transfersOut: Array<{ id: string; date: string; liters: number; destinationBranch: string }>;
  sales: Array<{ id: string; date: string; litersSold: number; recordedBy: string }>;
  totals: {
    base: number;
    supply: number;
    transferIn: number;
    transferOut: number;
    sold: number;
    computed: number;
  };
}

interface Props {
  initialRecords: SnapshotRecord[];
  branchOptions: { id: string; name: string }[];
  userRole: string;
  managedBranchIds: string[];
  varianceThreshold: number;
  liveStockMap?: Record<string, number>;
  lastSnapshotMap?: Record<string, { physicalLiters: number; date: string } | null>;
}

const snapshotSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z.string().min(1, "Date is required"),
  physicalLiters: z
    .number({ error: "Enter a number" })
    .nonnegative("Liters cannot be negative"),
  notes: z.string().optional(),
});

type SnapshotInput = z.infer<typeof snapshotSchema>;

const inputClass =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400";

let toastCounter = 0;

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function StockSnapshotsClient({
  initialRecords,
  branchOptions,
  userRole,
  managedBranchIds,
  varianceThreshold,
  liveStockMap = {},
  lastSnapshotMap = {},
}: Props) {
  const [records, setRecords] = useState<SnapshotRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SnapshotRecord | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ record: SnapshotRecord; action: "APPROVE" | "REJECT" } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [breakdownModal, setBreakdownModal] = useState<{ snapshotId: string; branchName: string } | null>(null);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const isED = userRole === "EXECUTIVE_DIRECTOR";

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SnapshotInput>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      branchId: managedBranchIds[0] ?? "",
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const filtered = records.filter((r) => {
    const matchSearch = r.branch.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || r.status === filter;
    return matchSearch && matchFilter;
  });

  async function onSubmit(data: SnapshotInput) {
    try {
      const res = await fetch("/api/stock-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast("error", err.error ?? "Failed to submit snapshot");
        return;
      }
      const created: SnapshotRecord = await res.json();
      setRecords((prev) => [created, ...prev]);
      const autoApproved = created.status === "APPROVED";
      addToast(
        "success",
        autoApproved
          ? "Stock snapshot recorded and auto-approved."
          : "Stock snapshot submitted — pending ED approval."
      );
      reset({ date: today, branchId: managedBranchIds[0] ?? "" });
      setAddOpen(false);
    } catch {
      addToast("error", "Network error. Please try again.");
    }
  }

  async function handleReview() {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      const res = await fetch(`/api/stock-snapshots/${reviewTarget.record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewTarget.action }),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast("error", err.error ?? "Review failed");
        return;
      }
      const updated: SnapshotRecord = await res.json();
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      addToast(
        "success",
        reviewTarget.action === "APPROVE" ? "Snapshot approved." : "Snapshot rejected."
      );
      setReviewTarget(null);
    } catch {
      addToast("error", "Network error. Please try again.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleEdit(data: { physicalLiters: number; notes: string }) {
    if (!editTarget) return;
    const res = await fetch(`/api/stock-snapshots/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "EDIT", physicalLiters: data.physicalLiters, notes: data.notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      addToast("error", err.error ?? "Edit failed");
      return;
    }
    const updated: SnapshotRecord = await res.json();
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    addToast("success", "Snapshot updated.");
    setEditTarget(null);
  }

  async function openBreakdown(snapshotId: string, branchName: string) {
    setBreakdownModal({ snapshotId, branchName });
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/stock-snapshots/${snapshotId}/breakdown`);
      if (res.ok) {
        const data = await res.json();
        setBreakdownData(data);
      } else {
        addToast("error", "Failed to load breakdown");
      }
    } catch {
      addToast("error", "Network error loading breakdown");
    } finally {
      setBreakdownLoading(false);
    }
  }

  // Get latest approved snapshot per branch (for ED cards)
  const branchStocks = isED
    ? branchOptions.map((branch) => {
        const latestApproved = records
          .filter((r) => r.branchId === branch.id && r.status === "APPROVED")
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return {
          branchId: branch.id,
          branchName: branch.name,
          computed: latestApproved ? Number(latestApproved.computedLiters) : 0,
          snapshotId: latestApproved?.id,
          lastUpdated: latestApproved?.date,
        };
      })
    : [];

  const tabs: FilterTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];
  const tabCounts: Record<FilterTab, number> = {
    ALL: records.length,
    PENDING: records.filter((r) => r.status === "PENDING").length,
    APPROVED: records.filter((r) => r.status === "APPROVED").length,
    REJECTED: records.filter((r) => r.status === "REJECTED").length,
  };

  function varianceLabel(v: number) {
    if (v > 0) return `+${v.toFixed(1)} L`;
    if (v < 0) return `${v.toFixed(1)} L`;
    return "0.0 L";
  }

  function varianceClass(v: number, threshold: number) {
    if (Math.abs(v) <= threshold) return "text-green-700 bg-green-50";
    return v > 0 ? "text-blue-700 bg-blue-50" : "text-red-700 bg-red-50";
  }

  function statusBadge(status: SnapshotRecord["status"]) {
    const map = {
      PENDING: "bg-yellow-50 text-yellow-700",
      APPROVED: "bg-green-50 text-green-700",
      REJECTED: "bg-red-50 text-red-700",
    };
    return `px-2 py-0.5 text-xs font-medium rounded-full ${map[status]}`;
  }

  return (
    <>
      {/* Breakdown Modal */}
      {breakdownModal && (
        <Modal open onClose={() => setBreakdownModal(null)} title={`${breakdownModal.branchName} — Stock Breakdown`}>
          {breakdownLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : breakdownData ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {breakdownData.baseSnapshot && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-600">
                    Base (from {formatDate(breakdownData.baseSnapshot.date)}):
                  </p>
                  <p className="font-semibold text-lg">+{breakdownData.baseSnapshot.physicalLiters.toFixed(1)} L</p>
                </div>
              )}

              {breakdownData.supplies.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Milk Supplied</p>
                  <div className="space-y-1">
                    {breakdownData.supplies.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {s.supplier} ({formatDate(s.date)})
                        </span>
                        <span className="font-medium text-green-700">+{s.liters.toFixed(1)} L</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total: +{breakdownData.totals.supply.toFixed(1)} L</p>
                </div>
              )}

              {breakdownData.transfersIn.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Transfers In</p>
                  <div className="space-y-1">
                    {breakdownData.transfersIn.map((t) => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          From {t.sourceBranch} ({formatDate(t.date)})
                        </span>
                        <span className="font-medium text-blue-700">+{t.liters.toFixed(1)} L</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total: +{breakdownData.totals.transferIn.toFixed(1)} L</p>
                </div>
              )}

              {breakdownData.transfersOut.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Transfers Out</p>
                  <div className="space-y-1">
                    {breakdownData.transfersOut.map((t) => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          To {t.destinationBranch} ({formatDate(t.date)})
                        </span>
                        <span className="font-medium text-orange-700">-{t.liters.toFixed(1)} L</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total: -{breakdownData.totals.transferOut.toFixed(1)} L</p>
                </div>
              )}

              {breakdownData.sales.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Sales</p>
                  <div className="space-y-1">
                    {breakdownData.sales.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {s.recordedBy} ({formatDate(s.date)})
                        </span>
                        <span className="font-medium text-red-700">-{s.litersSold.toFixed(1)} L</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total: -{breakdownData.totals.sold.toFixed(1)} L</p>
                </div>
              )}

              <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-4">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Computed Stock</p>
                <p className="text-2xl font-bold text-green-700">{breakdownData.totals.computed.toFixed(1)} L</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </Modal>
      )}

      <div className="space-y-6">
        {/* ED Stock Cards */}
        {isED && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStocks.map((stock) => {
                const liveStock = liveStockMap[stock.branchId] ?? 0;
                const lastSnap = lastSnapshotMap[stock.branchId] ?? null;
                const variance = lastSnap ? liveStock - lastSnap.physicalLiters : null;
                const absVariance = variance !== null ? Math.abs(variance) : null;
                const varianceHigh = absVariance !== null && absVariance > varianceThreshold;
                const lastCountDaysAgo = lastSnap
                  ? Math.floor((Date.now() - new Date(lastSnap.date).getTime()) / 86400000)
                  : null;
                const countStale = lastCountDaysAgo !== null && lastCountDaysAgo > 1;
                return (
                  <button
                    key={stock.branchId}
                    onClick={() => stock.snapshotId && openBreakdown(stock.snapshotId, stock.branchName)}
                    disabled={!stock.snapshotId}
                    className={`rounded-2xl p-5 border transition-all text-left ${
                      varianceHigh
                        ? "bg-white border-red-200 hover:border-red-400 hover:shadow-md cursor-pointer"
                        : stock.snapshotId
                        ? "bg-white border-gray-100 hover:border-green-400 hover:shadow-md cursor-pointer"
                        : "bg-gray-50 border-gray-200 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${varianceHigh ? "bg-red-100" : "bg-green-100"}`}>
                          <Droplet className={`w-4 h-4 ${varianceHigh ? "text-red-600" : "text-green-700"}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">{stock.branchName}</h3>
                      </div>
                      {stock.snapshotId && <ChevronRight className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Live Stock</p>
                        <p className="text-xl font-bold text-green-700">{liveStock.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">L</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Last Count</p>
                        {lastSnap ? (
                          <>
                            <p className={`text-xl font-bold ${countStale ? "text-amber-600" : "text-gray-800"}`}>
                              {lastSnap.physicalLiters.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">L</span>
                            </p>
                            <p className={`text-xs mt-0.5 ${countStale ? "text-amber-500" : "text-gray-400"}`}>
                              {lastCountDaysAgo === 0 ? "Today" : lastCountDaysAgo === 1 ? "Yesterday" : `${lastCountDaysAgo}d ago`}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-1">No count yet</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Variance</p>
                        {variance !== null ? (
                          <p className={`text-xl font-bold ${varianceHigh ? "text-red-600" : "text-gray-500"}`}>
                            {variance >= 0 ? "+" : ""}{variance.toFixed(1)}<span className="text-xs font-normal ml-0.5">L</span>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-1">—</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by branch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            />
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Record Stock Count
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}{" "}
              <span className="text-gray-400">({tabCounts[tab]})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <PackageSearch className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm">No stock snapshots found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Physical</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Computed</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Variance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recorded By</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                    {isED && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => {
                    const physical = Number(r.physicalLiters);
                    const computed = Number(r.computedLiters);
                    const variance = Number(r.varianceLiters);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                          {r.branch.name}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium whitespace-nowrap">
                          {physical.toFixed(1)} L
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                          {computed.toFixed(1)} L
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${varianceClass(variance, varianceThreshold)}`}>
                            {varianceLabel(variance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={statusBadge(r.status)}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {r.recordedBy.fullName}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">
                          {r.notes ?? "—"}
                        </td>
                        {isED && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setEditTarget(r)}
                                title="Edit"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {r.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => setReviewTarget({ record: r, action: "APPROVE" })}
                                    title="Approve"
                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setReviewTarget({ record: r, action: "REJECT" })}
                                    title="Reject"
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Snapshot Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset({ date: today, branchId: managedBranchIds[0] ?? "" }); }}
        title="Record Stock Count"
      >
        <p className="text-xs text-gray-500 mb-4">
          Enter the physical liters you counted. Counts within ±{varianceThreshold} L of the system total auto-approve; larger variances go to the ED for review.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" {...register("date")} max={today} className={inputClass} />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
            <select {...register("branchId")} className={inputClass}>
              <option value="">Select branch…</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Physical Liters Counted</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              {...register("physicalLiters", { valueAsNumber: true })}
              className={inputClass}
            />
            {errors.physicalLiters && (
              <p className="text-xs text-red-500 mt-1">{errors.physicalLiters.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Any observations about the count…"
              {...register("notes")}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setAddOpen(false); reset({ date: today, branchId: managedBranchIds[0] ?? "" }); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Submitting…" : "Submit Count"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm review dialog */}
      {reviewTarget && (
        <Modal
          open
          onClose={() => setReviewTarget(null)}
          title={reviewTarget.action === "APPROVE" ? "Approve Snapshot" : "Reject Snapshot"}
        >
          <p className="text-sm text-gray-600 mb-2">
            <strong>{reviewTarget.record.branch.name}</strong> —{" "}
            {formatDate(reviewTarget.record.date)}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Physical</p>
              <p className="font-semibold text-gray-900">{Number(reviewTarget.record.physicalLiters).toFixed(1)} L</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Computed</p>
              <p className="font-semibold text-gray-900">{Number(reviewTarget.record.computedLiters).toFixed(1)} L</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${Number(reviewTarget.record.varianceLiters) < 0 ? "bg-red-50" : "bg-blue-50"}`}>
              <p className="text-xs text-gray-500 mb-0.5">Variance</p>
              <p className={`font-semibold ${Number(reviewTarget.record.varianceLiters) < 0 ? "text-red-700" : "text-blue-700"}`}>
                {varianceLabel(Number(reviewTarget.record.varianceLiters))}
              </p>
            </div>
          </div>
          {reviewTarget.action === "APPROVE" ? (
            <p className="text-sm text-gray-600 mb-4">
              Approving will anchor this count as the new stock baseline. Future calculations will build on this physical count.
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Rejecting this snapshot will leave the current computed balance unchanged and ask the manager to recount.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setReviewTarget(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReview}
              disabled={reviewing}
              className={`px-5 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                reviewTarget.action === "APPROVE"
                  ? "bg-green-700 text-white hover:bg-green-800"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {reviewing
                ? "Processing…"
                : reviewTarget.action === "APPROVE"
                ? "Approve"
                : "Reject"}
            </button>
          </div>
        </Modal>
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Edit modal */}
      {editTarget && (
        <EditSnapshotModal
          record={editTarget}
          varianceThreshold={varianceThreshold}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
    </>
  );
}

function EditSnapshotModal({
  record,
  varianceThreshold,
  onClose,
  onSave,
}: {
  record: SnapshotRecord;
  varianceThreshold: number;
  onClose: () => void;
  onSave: (data: { physicalLiters: number; notes: string }) => Promise<void>;
}) {
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stock-snapshots/${record.id}/breakdown`)
      .then((r) => r.json())
      .then((data) => setBreakdown(data))
      .catch(() => {/* silently fail — form still works */})
      .finally(() => setBreakdownLoading(false));
  }, [record.id]);

  const editSchema = z.object({
    physicalLiters: z.number({ error: "Enter a number" }).nonnegative("Cannot be negative"),
    notes: z.string().optional(),
  });
  type EditInput = z.infer<typeof editSchema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      physicalLiters: Number(record.physicalLiters),
      notes: record.notes ?? "",
    },
  });

  const physicalLiters = watch("physicalLiters");
  const computed = Number(record.computedLiters);
  const previewVariance = (physicalLiters || 0) - computed;

  function SectionRow({
    label,
    value,
    color,
    sign,
    count,
    sectionKey,
    children,
  }: {
    label: string;
    value: number;
    color: string;
    sign: "+" | "−" | "=";
    count?: number;
    sectionKey: string;
    children?: React.ReactNode;
  }) {
    const isOpen = expandedSection === sectionKey;
    const hasDetail = count !== undefined && count > 0;
    return (
      <div>
        <button
          type="button"
          onClick={() => hasDetail && setExpandedSection(isOpen ? null : sectionKey)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${hasDetail ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-5 text-center font-mono font-bold text-xs ${color}`}>{sign}</span>
            <span className="text-gray-700">{label}</span>
            {count !== undefined && (
              <span className="text-xs text-gray-400">({count} record{count !== 1 ? "s" : ""})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold font-mono ${color}`}>{value.toFixed(1)} L</span>
            {hasDetail && (
              <span className="text-xs text-gray-400">{isOpen ? "▲" : "▼"}</span>
            )}
          </div>
        </button>
        {isOpen && hasDetail && (
          <div className="mx-3 mb-1 border border-gray-100 rounded-lg overflow-hidden">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title="Edit Snapshot">
      <div className="mb-3 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{record.branch.name}</span>
        {" — "}
        {formatDate(record.date)}
      </div>

      {/* Computed breakdown */}
      <div className="mb-4 border border-gray-100 rounded-xl overflow-hidden bg-white">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            How the computed figure was calculated
          </p>
          {breakdownLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
          )}
        </div>

        {breakdown ? (
          <div className="divide-y divide-gray-50 py-1">
            {/* Base */}
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 text-center font-mono font-bold text-xs text-gray-400">=</span>
                <span className="text-gray-700">
                  {breakdown.baseSnapshot
                    ? <>Opening balance <span className="text-xs text-gray-400">(snapshot {formatDate(breakdown.baseSnapshot.date)})</span></>
                    : "Opening balance (no prior snapshot — starting from zero)"
                  }
                </span>
              </div>
              <span className="font-semibold font-mono text-gray-700">{breakdown.totals.base.toFixed(1)} L</span>
            </div>

            {/* Deliveries */}
            <SectionRow
              label="Milk deliveries received"
              value={breakdown.totals.supply}
              color="text-green-700"
              sign="+"
              count={breakdown.supplies.length}
              sectionKey="supplies"
            >
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Date</th>
                    <th className="px-3 py-1.5 text-left">Supplier</th>
                    <th className="px-3 py-1.5 text-left">Ref</th>
                    <th className="px-3 py-1.5 text-right">Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.supplies.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-600">{formatDate(s.date)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{s.supplier}</td>
                      <td className="px-3 py-1.5 text-gray-400">{s.deliveryReference ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-green-700">+{s.liters.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50/60">
                    <td colSpan={3} className="px-3 py-1.5 text-xs font-semibold text-gray-600">Subtotal</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-green-700">+{breakdown.totals.supply.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </SectionRow>

            {/* Transfers in */}
            <SectionRow
              label="Transfers received from other branches"
              value={breakdown.totals.transferIn}
              color="text-blue-700"
              sign="+"
              count={breakdown.transfersIn.length}
              sectionKey="transfersIn"
            >
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Date</th>
                    <th className="px-3 py-1.5 text-left">From Branch</th>
                    <th className="px-3 py-1.5 text-right">Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.transfersIn.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-600">{formatDate(t.date)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{t.sourceBranch}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-blue-700">+{t.liters.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/60">
                    <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-gray-600">Subtotal</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-blue-700">+{breakdown.totals.transferIn.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </SectionRow>

            {/* Sales */}
            <SectionRow
              label="Sales"
              value={breakdown.totals.sold}
              color="text-red-600"
              sign="−"
              count={breakdown.sales.length}
              sectionKey="sales"
            >
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Date</th>
                    <th className="px-3 py-1.5 text-left">Recorded By</th>
                    <th className="px-3 py-1.5 text-right">Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-600">{formatDate(s.date)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{s.recordedBy}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-red-600">−{s.litersSold.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/60">
                    <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-gray-600">Subtotal</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-red-600">−{breakdown.totals.sold.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </SectionRow>

            {/* Transfers out */}
            <SectionRow
              label="Transfers sent to other branches"
              value={breakdown.totals.transferOut}
              color="text-orange-600"
              sign="−"
              count={breakdown.transfersOut.length}
              sectionKey="transfersOut"
            >
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Date</th>
                    <th className="px-3 py-1.5 text-left">To Branch</th>
                    <th className="px-3 py-1.5 text-right">Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.transfersOut.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-600">{formatDate(t.date)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{t.destinationBranch}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-orange-600">−{t.liters.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50/60">
                    <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-gray-600">Subtotal</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-orange-600">−{breakdown.totals.transferOut.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </SectionRow>

            {/* Computed total */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-semibold">
              <span className="text-gray-800">Computed total</span>
              <span className="font-mono text-gray-900">{breakdown.totals.computed.toFixed(1)} L</span>
            </div>
          </div>
        ) : !breakdownLoading ? (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">Could not load breakdown.</p>
        ) : (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit((d) => onSave({ physicalLiters: d.physicalLiters, notes: d.notes ?? "" }))}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Physical Liters Counted</label>
          <input
            type="number"
            step="0.1"
            min="0"
            {...register("physicalLiters", { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.physicalLiters && (
            <p className="text-xs text-red-500 mt-1">{errors.physicalLiters.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Computed</p>
            <p className="font-semibold text-gray-700">{computed.toFixed(1)} L</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Physical (new)</p>
            <p className="font-semibold text-gray-900">{(physicalLiters || 0).toFixed(1)} L</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${Math.abs(previewVariance) <= varianceThreshold ? "bg-green-50" : previewVariance > 0 ? "bg-blue-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-500 mb-0.5">Variance</p>
            <p className={`font-semibold text-xs ${Math.abs(previewVariance) <= varianceThreshold ? "text-green-700" : previewVariance > 0 ? "text-blue-700" : "text-red-700"}`}>
              {previewVariance >= 0 ? "+" : ""}{previewVariance.toFixed(1)} L
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <textarea rows={2} {...register("notes")} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
