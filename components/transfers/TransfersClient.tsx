"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils/date";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";

interface TransferRecord {
  id: string;
  date: string;
  liters: string;
  costPerLiter: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  sourceBranch: { id: string; name: string };
  destinationBranch: { id: string; name: string };
  requestedBy: { id: string; fullName: string };
  approvedBy: { id: string; fullName: string } | null;
  approvedAt: string | null;
  createdAt: string;
}

interface Props {
  initialRecords: TransferRecord[];
  branchOptions: { id: string; name: string }[];
  userRole: string;
  managedBranchIds: string[];
}

const transferSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    sourceBranchId: z.string().min(1, "Source branch is required"),
    destinationBranchId: z.string().min(1, "Destination branch is required"),
    liters: z.number().positive("Liters must be positive"),
    costPerLiter: z.number().positive("Cost per liter must be positive"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((d) => d.sourceBranchId !== d.destinationBranchId, {
    message: "Source and destination branches must be different",
    path: ["destinationBranchId"],
  });

type TransferInput = z.infer<typeof transferSchema>;

const inputClass =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400";

let toastCounter = 0;

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function TransfersClient({
  initialRecords,
  branchOptions,
  userRole,
  managedBranchIds,
}: Props) {
  const [records, setRecords] = useState<TransferRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransferRecord | null>(null);

  const isED = userRole === "EXECUTIVE_DIRECTOR";
  const isManager = userRole === "MANAGER";

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter((r) => {
    const matchesFilter = filter === "ALL" || r.status === filter;
    const matchesSearch =
      r.sourceBranch.name.toLowerCase().includes(search.toLowerCase()) ||
      r.destinationBranch.name.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy.fullName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  async function handleStatusChange(
    record: TransferRecord,
    status: "APPROVED" | "REJECTED"
  ) {
    const res = await fetch(`/api/transfers/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                status: updated.status,
                approvedBy: updated.approvedBy,
                approvedAt: updated.approvedAt,
              }
            : r
        )
      );
      addToast(
        "success",
        `Transfer ${status === "APPROVED" ? "approved" : "rejected"}`
      );
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Something went wrong");
    }
  }

  async function handleDelete(record: TransferRecord) {
    if (!confirm("Are you sure you want to delete this transfer?")) return;
    const res = await fetch(`/api/transfers/${record.id}`, { method: "DELETE" });
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      addToast("success", "Transfer deleted");
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Something went wrong");
    }
  }

  const statusBadge = (status: TransferRecord["status"]) => {
    const map = {
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}
      >
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const tabs: FilterTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filter === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 w-56"
              />
            </div>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isManager ? "Request Transfer" : "Add Transfer"}
          </button>
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
                  From → To
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Liters
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Requested By
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400 text-sm"
                  >
                    {search || filter !== "ALL"
                      ? "No transfers match your filters"
                      : "No transfers yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-gray-900 font-medium">
                        {record.sourceBranch.name}
                      </span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-900 font-medium">
                        {record.destinationBranch.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 font-mono text-xs">
                      {Number(record.liters).toFixed(1)} L
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(record.status)}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">
                      {record.requestedBy.fullName}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {isED && record.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => setEditTarget(record)}
                              className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(record, "APPROVED")
                              }
                              className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(record, "REJECTED")
                              }
                              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(isED ||
                          (isManager &&
                            record.status === "PENDING" &&
                            managedBranchIds.includes(record.sourceBranch.id))) && (
                          <button
                            onClick={() => handleDelete(record)}
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
          {filtered.length} of {records.length} transfers
        </p>
      </div>

      {/* Add Modal */}
      <TransferFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        userRole={userRole}
        managedBranchIds={managedBranchIds}
        onSuccess={(t) => {
          setRecords((prev) => [t, ...prev]);
          setAddOpen(false);
          addToast("success", "Transfer request created");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <TransferFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          editRecord={editTarget}
          branchOptions={branchOptions}
          userRole={userRole}
          managedBranchIds={managedBranchIds}
          onSuccess={(updated) => {
            setRecords((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setEditTarget(null);
            addToast("success", "Transfer updated");
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </>
  );
}

function TransferFormModal({
  open,
  onClose,
  editRecord,
  branchOptions,
  userRole,
  managedBranchIds,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: TransferRecord;
  branchOptions: { id: string; name: string }[];
  userRole: string;
  managedBranchIds: string[];
  onSuccess: (record: TransferRecord) => void;
  onError: (msg: string) => void;
}) {
  const isManager = userRole === "MANAGER";
  const defaultSourceId = isManager && managedBranchIds.length > 0
    ? managedBranchIds[0]
    : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: editRecord
        ? new Date(editRecord.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      sourceBranchId: editRecord?.sourceBranch.id ?? defaultSourceId,
      destinationBranchId: editRecord?.destinationBranch.id ?? "",
      liters: editRecord ? Number(editRecord.liters) : undefined,
      costPerLiter: editRecord ? Number(editRecord.costPerLiter) : undefined,
      reason: editRecord?.reason ?? "",
    },
  });

  const onSubmit = async (data: TransferInput) => {
    const url = editRecord ? `/api/transfers/${editRecord.id}` : "/api/transfers";
    const method = editRecord ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      onSuccess(json);
    }
  };

  // Branches available for source (manager locked to managed branches)
  const sourceBranches = isManager
    ? branchOptions.filter((b) => managedBranchIds.includes(b.id))
    : branchOptions;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editRecord ? "Edit Transfer" : isManager ? "Request Transfer" : "Add Transfer"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Date
          </label>
          <input
            type="date"
            {...register("date")}
            className={inputClass}
          />
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Source Branch
            </label>
            <select
              {...register("sourceBranchId")}
              disabled={isManager}
              className={inputClass}
            >
              <option value="">Select branch</option>
              {sourceBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.sourceBranchId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.sourceBranchId.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Destination Branch
            </label>
            <select {...register("destinationBranchId")} className={inputClass}>
              <option value="">Select branch</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.destinationBranchId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.destinationBranchId.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Liters
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              {...register("liters", { valueAsNumber: true })}
              className={inputClass}
              placeholder="0.0"
            />
            {errors.liters && (
              <p className="mt-1 text-xs text-red-500">{errors.liters.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Cost / Liter (UGX)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("costPerLiter", { valueAsNumber: true })}
              className={inputClass}
              placeholder="0.00"
            />
            {errors.costPerLiter && (
              <p className="mt-1 text-xs text-red-500">
                {errors.costPerLiter.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Reason
          </label>
          <input
            {...register("reason")}
            className={inputClass}
            placeholder="Reason for transfer"
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
          )}
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
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : editRecord
              ? "Save Changes"
              : isManager
              ? "Submit Request"
              : "Add Transfer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
