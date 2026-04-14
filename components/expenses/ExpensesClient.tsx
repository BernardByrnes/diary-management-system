"use client";

import { useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Flag, FileText, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import {
  expenseSchema,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseInput,
} from "@/lib/validations/expense";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  paymentMethod: string;
  receiptReference: string | null;
  isFlagged: boolean;
  flaggedAt: string | null;
  branch: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  createdAt: string;
}

interface Props {
  initialRecords: ExpenseRecord[];
  branchOptions: { id: string; name: string; rentCycle?: string | null }[];
  defaultRentCycle: "ANNUAL" | "BI_ANNUAL";
  userRole: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SALARIES: "Salaries",
  MEALS: "Meals",
  RENT: "Rent",
  TRANSPORT: "Transport",
  UTILITIES: "Utilities",
  MAINTENANCE: "Maintenance",
  MISCELLANEOUS: "Misc",
};

const CATEGORY_BADGE: Record<string, string> = {
  SALARIES: "bg-purple-100 text-purple-700",
  MEALS: "bg-orange-100 text-orange-700",
  RENT: "bg-red-100 text-red-700",
  TRANSPORT: "bg-blue-100 text-blue-700",
  UTILITIES: "bg-yellow-100 text-yellow-700",
  MAINTENANCE: "bg-gray-100 text-gray-600",
  MISCELLANEOUS: "bg-gray-100 text-gray-600",
};

let toastCounter = 0;

export default function ExpensesClient({
  initialRecords,
  branchOptions,
  defaultRentCycle,
  userRole,
}: Props) {
  const [records, setRecords] = useState<ExpenseRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
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
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.branch.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "ALL" || r.category === categoryFilter;
    const rDate = r.date.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo = !dateTo || rDate <= dateTo;
    return matchSearch && matchCategory && matchFrom && matchTo;
  });

  async function handleFlag(record: ExpenseRecord) {
    const isCurrentlyFlagged = record.isFlagged;
    const method = isCurrentlyFlagged ? "DELETE" : "POST";
    const res = await fetch("/api/expenses/flag", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId: record.id }),
    });
    if (res.ok) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, isFlagged: !isCurrentlyFlagged, flaggedAt: isCurrentlyFlagged ? null : new Date().toISOString() }
            : r
        )
      );
      addToast("success", isCurrentlyFlagged ? "Flag removed" : "Expense flagged for review");
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Failed to update flag");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        addToast("success", "Expense deleted");
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
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...EXPENSE_CATEGORIES] as string[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === cat
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "ALL" ? "All" : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            title="From date"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear dates
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const csv = generateCSV(
                  [
                    { key: "date" as const, label: "Date" },
                    { key: "branch" as const, label: "Branch" },
                    { key: "category" as const, label: "Category" },
                    { key: "description" as const, label: "Description" },
                    { key: "amount" as const, label: "Amount (UGX)" },
                    { key: "paymentMethod" as const, label: "Payment Method" },
                    { key: "receiptReference" as const, label: "Receipt Ref" },
                  ],
                  filtered.map((r) => ({
                    date: new Date(r.date).toLocaleDateString(),
                    branch: r.branch.name,
                    category: r.category,
                    description: r.description,
                    amount: r.amount,
                    paymentMethod: r.paymentMethod,
                    receiptReference: r.receiptReference ?? "",
                  }))
                );
                downloadCSV("expenses.csv", csv);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              title="Export CSV"
            >
              <FileText className="w-4 h-4 text-green-700" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <PdfButton
              title="Expenses"
              filename="expenses.pdf"
              columns={[
                { key: "date", label: "Date" },
                { key: "branch", label: "Branch" },
                { key: "category", label: "Category" },
                { key: "description", label: "Description" },
                { key: "amount", label: "Amount (UGX)" },
                { key: "paymentMethod", label: "Payment Method" },
                { key: "receiptReference", label: "Receipt Ref" },
              ]}
              rows={filtered.map((r) => ({
                date: new Date(r.date).toLocaleDateString(),
                branch: r.branch.name,
                category: r.category,
                description: r.description,
                amount: r.amount,
                paymentMethod: r.paymentMethod,
                receiptReference: r.receiptReference ?? "",
              }))}
            />
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
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
                  Category
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Description
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Payment
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                        <Receipt className="w-6 h-6 text-amber-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search || categoryFilter !== "ALL"
                          ? "No expenses match your filters"
                          : "No expenses recorded yet"}
                      </p>
                      {!search && categoryFilter === "ALL" && (
                        <p className="text-xs text-gray-400 mt-1">
                          Record branch expenses using the button above.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50/70 transition-colors ${r.isFlagged ? "bg-orange-50/40" : ""}`}>
                    <td className="px-5 py-3.5 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {new Date(r.date).toLocaleDateString()}
                        {r.isFlagged && (
                          <Flag className="w-3 h-3 text-orange-500 fill-orange-500 flex-shrink-0" aria-label="Flagged for review" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                      {r.branch.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          CATEGORY_BADGE[r.category] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell max-w-xs truncate">
                      {r.description}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      UGX {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.paymentMethod === "CASH"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {userRole === "OWNER" ? (
                          <button
                            onClick={() => handleFlag(r)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              r.isFlagged
                                ? "text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                            }`}
                            title={r.isFlagged ? "Remove flag" : "Flag for review"}
                          >
                            <Flag className={`w-4 h-4 ${r.isFlagged ? "fill-orange-500" : ""}`} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditTarget(r)}
                              className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {userRole === "EXECUTIVE_DIRECTOR" && (
                              <button
                                onClick={() => setDeleteTarget(r)}
                                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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
          {filtered.length} of {records.length} records
        </p>
      </div>

      {/* Add Modal */}
      <ExpenseFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        defaultRentCycle={defaultRentCycle}
        saving={saving}
        setSaving={setSaving}
        userRole={userRole}
        onSuccess={(newRecord) => {
          setRecords((prev) => [newRecord, ...prev]);
          setAddOpen(false);
          addToast("success", "Expense recorded successfully");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <ExpenseFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          branchOptions={branchOptions}
          defaultRentCycle={defaultRentCycle}
          saving={saving}
          setSaving={setSaving}
          editRecord={editTarget}
          userRole={userRole}
          onSuccess={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditTarget(null);
            addToast("success", "Expense updated successfully");
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Expense">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this expense?{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget.description}
              </span>{" "}
              — UGX {Number(deleteTarget.amount).toLocaleString()}
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
    </>
  );
}

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string; rentCycle?: string | null }[];
  defaultRentCycle: "ANNUAL" | "BI_ANNUAL";
  saving: boolean;
  setSaving: (v: boolean) => void;
  editRecord?: ExpenseRecord;
  onSuccess: (record: ExpenseRecord) => void;
  onError: (msg: string) => void;
  userRole: string;
}

function ExpenseFormModal({
  open,
  onClose,
  branchOptions,
  defaultRentCycle,
  saving,
  setSaving,
  editRecord,
  onSuccess,
  onError,
  userRole,
}: ExpenseFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: editRecord
        ? new Date(editRecord.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      branchId: editRecord?.branch.id ?? "",
      category: (editRecord?.category as ExpenseInput["category"]) ?? "MISCELLANEOUS",
      description: editRecord?.description ?? "",
      amount: editRecord ? Number(editRecord.amount) : undefined,
      paymentMethod: (editRecord?.paymentMethod as ExpenseInput["paymentMethod"]) ?? "CASH",
      receiptReference: editRecord?.receiptReference ?? "",
    },
  });

  const categoryWatch = watch("category");
  const branchIdWatch = watch("branchId");
  const effectiveRentCycle =
    branchOptions.find((b) => b.id === branchIdWatch)?.rentCycle ?? null;
  const isAnnual =
    effectiveRentCycle === "ANNUAL" || (!effectiveRentCycle && defaultRentCycle === "ANNUAL");
  const rentHint = isAnnual
    ? "Rent is typically paid once per year for this branch. Record the full annual amount when paid."
    : "Rent is typically paid every six months for this branch. Record the full period amount when paid.";
  const [coverageMonths, setCoverageMonths] = useState<number>(isAnnual ? 12 : 6);

  const visibleCategories = userRole === "MANAGER"
    ? EXPENSE_CATEGORIES.filter((c) => c !== "RENT")
    : EXPENSE_CATEGORIES;

  const onSubmit = async (data: ExpenseInput) => {
    setSaving(true);
    try {
      const url = editRecord ? `/api/expenses/${editRecord.id}` : "/api/expenses";
      const method = editRecord ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(data.category === "RENT" ? { coverageMonths } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? "Something went wrong");
      } else {
        const record: ExpenseRecord = {
          id: json.id,
          date: json.date,
          category: json.category,
          description: json.description,
          amount: json.amount,
          paymentMethod: json.paymentMethod,
          receiptReference: json.receiptReference,
          isFlagged: json.isFlagged ?? false,
          flaggedAt: json.flaggedAt ?? null,
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
      title={editRecord ? "Edit Expense" : "Record Expense"}
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

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
          <select
            {...register("category")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            {visibleCategories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
          )}
          {categoryWatch === "RENT" && (
            <>
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {rentHint}
              </p>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Coverage Period
                </label>
                <select
                  value={coverageMonths}
                  onChange={(e) => setCoverageMonths(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                >
                  <option value={6}>6 months (bi-annual)</option>
                  <option value={12}>12 months (annual)</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
          <input
            type="text"
            {...register("description")}
            placeholder="e.g. Monthly rent payment"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
          )}
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

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
          <select
            {...register("paymentMethod")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm === "CASH" ? "Cash" : "Bank"}
              </option>
            ))}
          </select>
          {errors.paymentMethod && (
            <p className="mt-1 text-xs text-red-500">{errors.paymentMethod.message}</p>
          )}
        </div>

        {/* Receipt Reference (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Receipt Reference{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            {...register("receiptReference")}
            placeholder="e.g. REC-001"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
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
            {saving ? "Saving..." : editRecord ? "Save Changes" : "Record Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
