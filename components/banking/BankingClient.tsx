"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils/date";
import { Plus, Layers, Search, Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import BulkBankingModal from "./BulkBankingModal";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { DiscrepancyTooltip } from "@/components/ui/Tooltip";
import { bankDepositSchema, type BankDepositInput } from "@/lib/validations/bank-deposit";

interface DepositRecord {
  id: string;
  date: string;
  amount: string;
  bankName: string;
  referenceNumber: string;
  hasDiscrepancy: boolean;
  discrepancyNote: string | null;
  branch: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  createdAt: string;
}

interface Props {
  initialRecords: DepositRecord[];
  branchOptions: { id: string; name: string }[];
  userRole: string;
}

let toastCounter = 0;

export default function BankingClient({ initialRecords, branchOptions, userRole }: Props) {
  const [records, setRecords] = useState<DepositRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DepositRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepositRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch =
      r.bankName.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.branch.name.toLowerCase().includes(search.toLowerCase());
    const rDate = r.date.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo = !dateTo || rDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/banking/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        addToast("success", "Bank deposit deleted");
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
                placeholder="Search deposits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
            >
              <Layers className="w-4 h-4" />
              Bulk Entry
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Deposit
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
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Branch
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Bank
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Reference
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Discrepancy
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    {search ? "No deposits match your search" : "No bank deposits recorded yet"}
                  </td>
                </tr>
              ) : (
filtered.map((r) => (
  <tr 
    key={r.id} 
    onClick={() => setEditTarget(r)}
    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
  >
    <td className="px-5 py-3.5 text-gray-700">
      {formatDate(r.date)}
    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                      {r.branch.name}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      UGX {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                      {r.bankName}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs hidden lg:table-cell">
                      {r.referenceNumber}
                    </td>
<td className="px-5 py-3.5">
              {r.hasDiscrepancy ? (
                <DiscrepancyTooltip content={r.discrepancyNote ?? ""} />
              ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Clear
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
<button
              onClick={(e) => { e.stopPropagation(); setEditTarget(r); }}
              className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {userRole === "EXECUTIVE_DIRECTOR" && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 px-1">
          {filtered.length} of {records.length} deposits
        </p>
      </div>

      {/* Add Modal */}
      <DepositFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        saving={saving}
        setSaving={setSaving}
        onSuccess={(newRecord) => {
          setRecords((prev) => [newRecord, ...prev]);
          setAddOpen(false);
          addToast("success", "Bank deposit recorded successfully");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <DepositFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          branchOptions={branchOptions}
          saving={saving}
          setSaving={setSaving}
          editRecord={editTarget}
          onSuccess={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditTarget(null);
            addToast("success", "Bank deposit updated successfully");
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Deposit">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the deposit of{" "}
              <span className="font-medium text-gray-900">
                UGX {Number(deleteTarget.amount).toLocaleString()}
              </span>{" "}
              (Ref: <span className="font-mono">{deleteTarget.referenceNumber}</span>)?
            </p>
            <p className="text-xs text-red-500">This action cannot be undone.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <BulkBankingModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        branchOptions={branchOptions}
        onSuccess={(newRecords) => setRecords((prev) => [...(newRecords as DepositRecord[]), ...prev])}
        onError={(msg) => addToast("error", msg)}
      />
    </>
  );
}

interface DepositFormModalProps {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  editRecord?: DepositRecord;
  onSuccess: (record: DepositRecord) => void;
  onError: (msg: string) => void;
}

function DepositFormModal({
  open,
  onClose,
  branchOptions,
  saving,
  setSaving,
  editRecord,
  onSuccess,
  onError,
}: DepositFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BankDepositInput>({
    resolver: zodResolver(bankDepositSchema),
    defaultValues: {
      date: editRecord
        ? new Date(editRecord.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      branchId: editRecord?.branch.id ?? "",
      amount: editRecord ? Number(editRecord.amount) : undefined,
      bankName: editRecord?.bankName ?? "",
      referenceNumber: editRecord?.referenceNumber ?? "",
      hasDiscrepancy: editRecord?.hasDiscrepancy ?? false,
      discrepancyNote: editRecord?.discrepancyNote ?? "",
    },
  });

  const hasDiscrepancy = useWatch({ control, name: "hasDiscrepancy" });

  const onSubmit = async (data: BankDepositInput) => {
    setSaving(true);
    try {
      const url = editRecord ? `/api/banking/${editRecord.id}` : "/api/banking";
      const method = editRecord ? "PATCH" : "POST";

      const payload = {
        ...data,
        discrepancyNote: data.hasDiscrepancy ? (data.discrepancyNote ?? null) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? "Something went wrong");
      } else {
        const record: DepositRecord = {
          id: json.id,
          date: json.date,
          amount: json.amount,
          bankName: json.bankName,
          referenceNumber: json.referenceNumber,
          hasDiscrepancy: json.hasDiscrepancy,
          discrepancyNote: json.discrepancyNote,
          branch: json.branch,
          recordedBy: json.recordedBy,
          createdAt: json.createdAt,
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
      title={editRecord ? "Edit Bank Deposit" : "Record Bank Deposit"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {/* Branch */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
          <select
            {...register("branchId")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="">Select branch...</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>
          )}
        </div>

        {/* Cash expense warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-xs text-amber-800">
          <span className="font-semibold">Before logging this deposit</span> — make sure all cash expenses paid out today (e.g. maintenance, transport) are already recorded. Cash expenses reduce the expected deposit amount; recording them later will not clear a variance flag.
        </div>

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

        {/* Bank Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Bank Name</label>
          <input
            type="text"
            {...register("bankName")}
            placeholder="e.g. Stanbic Bank"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.bankName && (
            <p className="mt-1 text-xs text-red-500">{errors.bankName.message}</p>
          )}
        </div>

        {/* Reference Number */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Reference Number
          </label>
          <input
            type="text"
            {...register("referenceNumber")}
            placeholder="e.g. DEP-2024-001"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.referenceNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.referenceNumber.message}</p>
          )}
        </div>

        {/* Has Discrepancy checkbox */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("hasDiscrepancy")}
              className="w-4 h-4 rounded text-orange-600 border-gray-300 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Flag discrepancy</span>
          </label>
        </div>

        {/* Discrepancy Note (only visible when hasDiscrepancy is checked) */}
        {hasDiscrepancy && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Discrepancy Note
            </label>
            <textarea
              {...register("discrepancyNote")}
              rows={3}
              placeholder="Describe the discrepancy..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none"
            />
          </div>
        )}

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
            {saving ? "Saving..." : editRecord ? "Save Changes" : "Record Deposit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
