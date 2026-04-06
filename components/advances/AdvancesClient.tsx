"use client";

import { useState, useCallback } from "react";
import { Plus, Search, Trash2, CheckCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { advanceSchema, type AdvanceInput } from "@/lib/validations/advance";

interface AdvanceRecord {
  id: string;
  recipientType: "SUPPLIER" | "OWNER";
  amount: string;
  date: string;
  purpose: string;
  isDeducted: boolean;
  deductedAt: string | null;
  supplier: { id: string; name: string } | null;
  owner: { id: string; fullName: string } | null;
  branch: { id: string; name: string } | null;
  recordedBy: { id: string; fullName: string };
}

interface Props {
  initialRecords: AdvanceRecord[];
  supplierOptions: { id: string; name: string }[];
  ownerOptions: { id: string; fullName: string }[];
  branchOptions: { id: string; name: string }[];
}

let toastCounter = 0;

export default function AdvancesClient({
  initialRecords,
  supplierOptions,
  ownerOptions,
  branchOptions,
}: Props) {
  const [records, setRecords] = useState<AdvanceRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdvanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter((r) => {
    const recipientName = r.supplier?.name ?? r.owner?.fullName ?? "";
    const matchSearch =
      recipientName.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose.toLowerCase().includes(search.toLowerCase()) ||
      (r.branch?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const rDate = r.date.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo = !dateTo || rDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  async function handleMarkDeducted(record: AdvanceRecord) {
    setMarking(record.id);
    try {
      const res = await fetch(`/api/advances/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeducted: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords((prev) =>
          prev.map((r) =>
            r.id === record.id
              ? {
                  ...r,
                  isDeducted: updated.isDeducted,
                  deductedAt: updated.deductedAt,
                }
              : r
          )
        );
        addToast("success", "Advance marked as deducted");
      } else {
        const data = await res.json();
        addToast("error", data.error ?? "Failed to update");
      }
    } finally {
      setMarking(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/advances/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        addToast("success", "Advance deleted");
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        addToast("error", data.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        {/* Toolbar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search advances..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Advance
            </button>
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Recipient
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Purpose
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    {search ? "No advances match your search" : "No advances recorded yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-gray-700">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {r.supplier?.name ?? r.owner?.fullName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.recipientType === "SUPPLIER"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {r.recipientType === "SUPPLIER" ? "Supplier" : "Owner"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      UGX {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell max-w-xs truncate">
                      {r.purpose}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.isDeducted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Deducted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {!r.isDeducted && (
                          <button
                            onClick={() => handleMarkDeducted(r)}
                            disabled={marking === r.id}
                            className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Mark as Deducted"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 px-1">
          {filtered.length} of {records.length} advances
        </p>
      </div>

      {/* Add Modal */}
      <AdvanceFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        supplierOptions={supplierOptions}
        ownerOptions={ownerOptions}
        branchOptions={branchOptions}
        saving={saving}
        setSaving={setSaving}
        onSuccess={(newRecord) => {
          setRecords((prev) => [newRecord, ...prev]);
          setAddOpen(false);
          addToast("success", "Advance recorded successfully");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Advance">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this advance of{" "}
              <span className="font-medium text-gray-900">
                UGX {Number(deleteTarget.amount).toLocaleString()}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget.supplier?.name ?? deleteTarget.owner?.fullName ?? "—"}
              </span>
              ?
            </p>
            {deleteTarget.isDeducted && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                This advance has already been deducted and cannot be deleted.
              </p>
            )}
            {!deleteTarget.isDeducted && (
              <p className="text-xs text-red-500">This action cannot be undone.</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              {!deleteTarget.isDeducted && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

interface AdvanceFormModalProps {
  open: boolean;
  onClose: () => void;
  supplierOptions: { id: string; name: string }[];
  ownerOptions: { id: string; fullName: string }[];
  branchOptions: { id: string; name: string }[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onSuccess: (record: AdvanceRecord) => void;
  onError: (msg: string) => void;
}

function AdvanceFormModal({
  open,
  onClose,
  supplierOptions,
  ownerOptions,
  branchOptions,
  saving,
  setSaving,
  onSuccess,
  onError,
}: AdvanceFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AdvanceInput>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      recipientType: "SUPPLIER",
      date: new Date().toISOString().slice(0, 10),
      purpose: "",
      supplierId: "",
      ownerId: "",
      branchId: "",
    },
  });

  const recipientType = useWatch({ control, name: "recipientType" });

  const onSubmit = async (data: AdvanceInput) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        supplierId: data.recipientType === "SUPPLIER" ? data.supplierId : undefined,
        ownerId: data.recipientType === "OWNER" ? data.ownerId : undefined,
        branchId: data.branchId || undefined,
      };

      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? "Something went wrong");
      } else {
        const record: AdvanceRecord = {
          id: json.id,
          recipientType: json.recipientType,
          amount: json.amount,
          date: json.date,
          purpose: json.purpose,
          isDeducted: json.isDeducted,
          deductedAt: json.deductedAt,
          supplier: json.supplier,
          owner: json.owner,
          branch: json.branch,
          recordedBy: json.recordedBy,
        };
        reset();
        onSuccess(record);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Record Advance"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Recipient Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Recipient Type</label>
          <select
            {...register("recipientType")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="SUPPLIER">Supplier</option>
            <option value="OWNER">Owner</option>
          </select>
          {errors.recipientType && (
            <p className="mt-1 text-xs text-red-500">{errors.recipientType.message}</p>
          )}
        </div>

        {/* Conditional: Supplier or Owner select */}
        {recipientType === "SUPPLIER" ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Supplier</label>
            <select
              {...register("supplierId")}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
            >
              <option value="">Select supplier...</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 text-xs text-red-500">{errors.supplierId.message}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
            <select
              {...register("ownerId")}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
            >
              <option value="">Select owner...</option>
              {ownerOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.fullName}
                </option>
              ))}
            </select>
            {errors.ownerId && (
              <p className="mt-1 text-xs text-red-500">{errors.ownerId.message}</p>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount (UGX)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
          <input
            type="date"
            {...register("date")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Purpose</label>
          <input
            type="text"
            {...register("purpose")}
            placeholder="e.g. Working capital advance"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.purpose && (
            <p className="mt-1 text-xs text-red-500">{errors.purpose.message}</p>
          )}
        </div>

        {/* Branch (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Branch <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            {...register("branchId")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="">No branch</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Record Advance"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
