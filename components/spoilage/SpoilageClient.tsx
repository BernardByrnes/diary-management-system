"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils/date";
import { Plus, Search, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";

let toastCounter = 0;

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().min(1, "Branch is required"),
  liters: z.number().positive("Liters must be positive"),
  reason: z.string().min(1, "Reason is required"),
});
type FormData = z.infer<typeof schema>;

interface SpoilageRecord {
  id: string;
  date: string;
  liters: string;
  reason: string;
  status: string;
  branch: { id: string; name: string };
  reportedBy: { id: string; fullName: string };
  reviewedBy: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface Props {
  initialRecords: SpoilageRecord[];
  branchOptions: { id: string; name: string }[];
  userRole: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function SpoilageClient({ initialRecords, branchOptions, userRole }: Props) {
  const [records, setRecords] = useState<SpoilageRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpoilageRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch =
      r.branch.name.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleReview(id: string, action: "APPROVE" | "REJECT") {
    try {
      const res = await fetch(`/api/spoilage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) { addToast("error", json.error ?? "Failed"); return; }
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: json.status, reviewedBy: json.reviewedBy, reviewedAt: json.reviewedAt } : r));
      addToast("success", action === "APPROVE" ? "Spoilage approved — stock updated" : "Spoilage rejected");
    } catch { addToast("error", "Something went wrong"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/spoilage/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); addToast("error", j.error ?? "Failed"); return; }
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      addToast("success", "Record deleted");
    } catch { addToast("error", "Something went wrong"); }
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by branch or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>
          <div className="ml-auto">
            {(userRole === "MANAGER" || userRole === "EXECUTIVE_DIRECTOR") && (
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Report Spoilage
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Liters</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Reported By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  {userRole === "EXECUTIVE_DIRECTOR" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === "EXECUTIVE_DIRECTOR" ? 7 : 6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No spoilage records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.branch.name}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(r.liters).toFixed(1)} L</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3 text-gray-600">{r.reportedBy.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status] ?? ""}`}>
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      {userRole === "EXECUTIVE_DIRECTOR" && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleReview(r.id, "APPROVE")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleReview(r.id, "REJECT")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} of {records.length} records
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {addOpen && (
        <SpoilageFormModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          branchOptions={branchOptions}
          saving={saving}
          setSaving={setSaving}
          onSuccess={(rec) => { setRecords((prev) => [rec, ...prev]); setAddOpen(false); addToast("success", "Spoilage reported — pending ED approval"); }}
          onError={(msg) => addToast("error", msg)}
          userRole={userRole}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Record">
          <p className="text-sm text-gray-600 mb-6">
            Delete spoilage record of <span className="font-semibold">{Number(deleteTarget.liters).toFixed(1)}L</span> from {deleteTarget.branch.name}?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl">Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SpoilageFormModal({
  open, onClose, branchOptions, saving, setSaving, onSuccess, onError, userRole,
}: {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onSuccess: (r: SpoilageRecord) => void;
  onError: (msg: string) => void;
  userRole: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/spoilage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "Something went wrong"); return; }
      onSuccess(json);
    } catch { onError("Something went wrong"); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Report Spoilage">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-xs text-amber-800">
          {userRole === "MANAGER"
            ? "This report will be sent to the ED for approval. Stock is only updated after approval."
            : "As ED, this spoilage will be immediately approved and deducted from stock."}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
          <input type="date" {...register("date")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
          <select {...register("branchId")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white">
            <option value="">Select branch</option>
            {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {errors.branchId && <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Liters Lost</label>
          <input type="number" step="0.1" min="0" {...register("liters", { valueAsNumber: true })} placeholder="0.0" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
          {errors.liters && <p className="mt-1 text-xs text-red-500">{errors.liters.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason</label>
          <input type="text" {...register("reason")} placeholder="e.g. Power outage, storage failure, quality rejection" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
          {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 rounded-xl font-medium">
            {saving ? "Saving..." : "Submit Report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
