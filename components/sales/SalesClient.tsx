"use client";

import { useState, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils/date";
import { Plus, Search, Pencil, Trash2, FileText, ShoppingCart } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { saleSchema, type SaleInput } from "@/lib/validations/sale";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface SaleRecord {
  id: string;
  date: string;
  litersSold: string;
  pricePerLiter: string;
  revenue: string;
  branch: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  createdAt: string;
  milkSupplyId?: string | null;
  milkSupply?: { id: string; date: string } | null;
}

interface Props {
  initialRecords: SaleRecord[];
  branchOptions: { id: string; name: string }[];
  /** Current FIFO retail price per branch — auto-filled into the price field. */
  fifoPriceByBranch: { branchId: string; retailPricePerLiter: number | null }[];
  userRole: string;
  managedBranchIds: string[];
}

let toastCounter = 0;

export default function SalesClient({
  initialRecords,
  branchOptions,
  fifoPriceByBranch,
  userRole,
  managedBranchIds,
}: Props) {
  const [records, setRecords] = useState<SaleRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SaleRecord | null>(null);
  const [viewTarget, setViewTarget] = useState<SaleRecord | null>(null);

  const addToast = useCallback(
    (type: "success" | "error", message: string) => {
      const id = String(++toastCounter);
      setToasts((prev) => [...prev, { id, type, message }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch = r.branch.name.toLowerCase().includes(search.toLowerCase());
    const rDate = r.date.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo = !dateTo || rDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  async function handleDelete(record: SaleRecord) {
    if (
      !confirm(
        `Delete sale record for ${record.branch.name} on ${formatDate(record.date)}?`
      )
    )
      return;

    const res = await fetch(`/api/sales/${record.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      addToast("success", "Sale record deleted successfully");
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Failed to delete record");
    }
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by branch..."
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
                    { key: "litersSold" as const, label: "Liters Sold" },
                    { key: "pricePerLiter" as const, label: "Price/Liter (UGX)" },
                    { key: "revenue" as const, label: "Revenue (UGX)" },
                    { key: "recordedBy" as const, label: "Recorded By" },
                  ],
                  filtered.map((r) => ({
                    date: formatDate(r.date),
                    branch: r.branch.name,
                    litersSold: r.litersSold,
                    pricePerLiter: r.pricePerLiter,
                    revenue: r.revenue,
                    recordedBy: r.recordedBy.fullName,
                  }))
                );
                downloadCSV("sales.csv", csv);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              title="Export CSV"
            >
              <FileText className="w-4 h-4 text-green-700" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <PdfButton
              title="Sales Records"
              filename="sales.pdf"
              columns={[
                { key: "date", label: "Date" },
                { key: "branch", label: "Branch" },
                { key: "litersSold", label: "Liters Sold" },
                { key: "pricePerLiter", label: "Price/Liter (UGX)" },
                { key: "revenue", label: "Revenue (UGX)" },
                { key: "recordedBy", label: "Recorded By" },
              ]}
              rows={filtered.map((r) => ({
                date: formatDate(r.date),
                branch: r.branch.name,
                litersSold: r.litersSold,
                pricePerLiter: r.pricePerLiter,
                revenue: r.revenue,
                recordedBy: r.recordedBy.fullName,
              }))}
            />
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Sale
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
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Branch
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Liters Sold
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Price/L
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Revenue
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
<tbody className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                    <ShoppingCart className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {search ? "No records match your search" : "No sale records yet"}
                  </p>
                  {!search && (
                    <p className="text-xs text-gray-400 mt-1">
                      Record today&apos;s sales using the button above.
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                onClick={() => setViewTarget(r)}
              >
                <td className="px-5 py-3.5">
                  <span className="font-medium text-gray-900">
                    {formatDate(r.date)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                  {r.branch.name}
                </td>
                <td className="px-5 py-3.5 text-gray-700 text-right">
                  {Number(r.litersSold).toFixed(1)} L
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-right hidden lg:table-cell">
                  UGX {Number(r.pricePerLiter).toLocaleString()}
                </td>
                <td className="px-5 py-3.5 font-medium text-gray-900 text-right">
                  UGX {Number(r.revenue).toLocaleString()}
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditTarget(r)}
                      className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {userRole === "EXECUTIVE_DIRECTOR" && (
                      <button
                        onClick={() => handleDelete(r)}
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
          {filtered.length} of {records.length} record
          {records.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Add Modal */}
      <SaleFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        fifoPriceByBranch={fifoPriceByBranch}
        userRole={userRole}
        managedBranchIds={managedBranchIds}
        onSuccess={(record) => {
          setRecords((prev) => [record, ...prev]);
          setAddOpen(false);
          addToast("success", "Sale record added");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <SaleFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          editRecord={editTarget}
          branchOptions={branchOptions}
          fifoPriceByBranch={fifoPriceByBranch}
          userRole={userRole}
          managedBranchIds={managedBranchIds}
          onSuccess={(updated) => {
            setRecords((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setEditTarget(null);
            addToast("success", "Record updated successfully");
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}

        {/* View Modal */}
        {viewTarget && (
          <Modal
            open={!!viewTarget}
            onClose={() => setViewTarget(null)}
            title="Sale Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(viewTarget.date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Branch</p>
                  <p className="text-sm font-medium text-gray-900">{viewTarget.branch.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Liters Sold</p>
                  <p className="text-sm font-medium text-gray-900">{Number(viewTarget.litersSold).toFixed(1)} L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Price per Liter</p>
                  <p className="text-sm font-medium text-gray-900">UGX {Number(viewTarget.pricePerLiter).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Revenue</p>
                  <p className="text-lg font-semibold text-green-700">UGX {Number(viewTarget.revenue).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">From Delivery</p>
                  <p className="text-sm text-gray-700">
                    {viewTarget.milkSupply
                      ? formatDate(viewTarget.milkSupply.date)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Recorded By</p>
                  <p className="text-sm text-gray-700">{viewTarget.recordedBy.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-500">
                    {new Date(viewTarget.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setViewTarget(null);
                    setEditTarget(viewTarget);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Record
                </button>
                {userRole === "EXECUTIVE_DIRECTOR" && (
                  <button
                    onClick={() => {
                      setViewTarget(null);
                      handleDelete(viewTarget);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

function SaleFormModal({
  open,
  onClose,
  editRecord,
  branchOptions,
  fifoPriceByBranch,
  userRole,
  managedBranchIds,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: SaleRecord;
  branchOptions: { id: string; name: string }[];
  fifoPriceByBranch: { branchId: string; retailPricePerLiter: number | null }[];
  userRole: string;
  managedBranchIds: string[];
  onSuccess: (record: SaleRecord) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleInput>({
    resolver: zodResolver(saleSchema) as Resolver<SaleInput>,
    defaultValues: {
      date: editRecord ? editRecord.date.split("T")[0] : "",
      branchId: editRecord?.branch.id ?? "",
      litersSold: editRecord ? Number(editRecord.litersSold) : undefined,
      pricePerLiter: editRecord ? Number(editRecord.pricePerLiter) : undefined,
    },
  });

  const branchIdWatch = watch("branchId");

  // Auto-fill FIFO retail price when branch changes (new sale only).
  const prevBranch = useMemo(() => ({ id: "" }), []);
  useMemo(() => {
    if (editRecord) return;
    if (branchIdWatch && branchIdWatch !== prevBranch.id) {
      prevBranch.id = branchIdWatch;
      const fifo = fifoPriceByBranch.find((x) => x.branchId === branchIdWatch);
      if (fifo?.retailPricePerLiter != null) {
        setValue("pricePerLiter", fifo.retailPricePerLiter, { shouldValidate: false });
      }
    }
  }, [branchIdWatch, fifoPriceByBranch, setValue, editRecord, prevBranch]);

  const fifoHint = fifoPriceByBranch.find((x) => x.branchId === branchIdWatch);

  const onSubmit = async (data: SaleInput) => {
    if (userRole === "MANAGER" && data.branchId && !managedBranchIds.includes(data.branchId)) {
      onError("You are not authorized to record sales for this branch.");
      return;
    }

    const url = editRecord ? `/api/sales/${editRecord.id}` : "/api/sales";
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
      const record: SaleRecord = {
        id: json.id,
        date: typeof json.date === "string" ? json.date : new Date(json.date).toISOString(),
        litersSold: json.litersSold.toString(),
        pricePerLiter: json.pricePerLiter.toString(),
        revenue: json.revenue.toString(),
        branch: json.branch,
        recordedBy: json.recordedBy,
        createdAt: typeof json.createdAt === "string" ? json.createdAt : new Date(json.createdAt).toISOString(),
        milkSupplyId: json.milkSupplyId ?? null,
        milkSupply: json.milkSupply
          ? { id: json.milkSupply.id, date: typeof json.milkSupply.date === "string" ? json.milkSupply.date : new Date(json.milkSupply.date).toISOString() }
          : null,
      };
      reset();
      onSuccess(record);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400";

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={editRecord ? "Edit Sale Record" : "Record Sale"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
          <input type="date" {...register("date")} className={inputClass} />
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
          <select {...register("branchId")} className={inputClass}>
            <option value="">Select branch...</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.branchId && <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>}
          {fifoHint && fifoHint.retailPricePerLiter != null && (
            <p className="mt-1.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
              Current batch price: <strong>UGX {fifoHint.retailPricePerLiter.toLocaleString()} / L</strong> — auto-filled below
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Liters Sold</label>
          <input
            type="number"
            step="0.1"
            min="0"
            {...register("litersSold", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 40.5"
          />
          {errors.litersSold && <p className="mt-1 text-xs text-red-500">{errors.litersSold.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Price per Liter (UGX)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("pricePerLiter", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 1800"
          />
          {errors.pricePerLiter && <p className="mt-1 text-xs text-red-500">{errors.pricePerLiter.message}</p>}
          <p className="mt-1 text-xs text-gray-400">Override if selling at a different price for this sale.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {isSubmitting ? "Saving..." : editRecord ? "Save Changes" : "Record Sale"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
