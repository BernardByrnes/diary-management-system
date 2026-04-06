"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, FileText, ShoppingCart } from "lucide-react";
import { useForm } from "react-hook-form";
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

export interface SupplyDeliveryOption {
  id: string;
  branchId: string;
  date: string;
  liters: string;
  costPerLiter: string;
  retailPricePerLiter: string | null;
}

interface Props {
  initialRecords: SaleRecord[];
  branchOptions: { id: string; name: string }[];
  /** Latest milk purchase cost per branch (for batch-based retail pricing hints). */
  latestPurchaseCostByBranch: {
    branchId: string;
    costPerLiter: number;
    date: string;
    retailPricePerLiter: number | null;
  }[];
  /** Recent deliveries per branch — pick one to default retail price (main vs satellite branches can differ). */
  deliveryOptions: SupplyDeliveryOption[];
  userRole: string;
  managedBranchIds: string[];
}

let toastCounter = 0;

export default function SalesClient({
  initialRecords,
  branchOptions,
  latestPurchaseCostByBranch,
  deliveryOptions,
  userRole,
}: Props) {
  const [records, setRecords] = useState<SaleRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SaleRecord | null>(null);

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
        `Delete sale record for ${record.branch.name} on ${new Date(record.date).toLocaleDateString()}?`
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
                    date: new Date(r.date).toLocaleDateString(),
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
                date: new Date(r.date).toLocaleDateString(),
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

        <div className="rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3 text-sm text-orange-950">
          <p className="font-medium">Retail price is set on each milk delivery</p>
          <p className="mt-1 text-orange-900/90 leading-relaxed">
            When milk arrives, ED sets <strong>retail UGX/L</strong> for that batch. Here, choose which
            delivery you are selling from to prefill price—branches can differ (e.g. main branch fresh
            stock at a new price while others still sell older stock). You can still change the price for
            discounts; past sales stay unchanged.
          </p>
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
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden xl:table-cell">
                  From delivery
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
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900">
                        {new Date(r.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                      {r.branch.name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-right">
                      {Number(r.litersSold).toFixed(1)} L
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs hidden xl:table-cell max-w-36 truncate" title={r.milkSupply ? new Date(r.milkSupply.date).toLocaleDateString() : ""}>
                      {r.milkSupply
                        ? new Date(r.milkSupply.date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-right hidden lg:table-cell">
                      UGX {Number(r.pricePerLiter).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900 text-right">
                      UGX {Number(r.revenue).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
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
        latestPurchaseCostByBranch={latestPurchaseCostByBranch}
        deliveryOptions={deliveryOptions}
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
          latestPurchaseCostByBranch={latestPurchaseCostByBranch}
          deliveryOptions={deliveryOptions}
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
    </>
  );
}

function SaleFormModal({
  open,
  onClose,
  editRecord,
  branchOptions,
  latestPurchaseCostByBranch,
  deliveryOptions,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: SaleRecord;
  branchOptions: { id: string; name: string }[];
  latestPurchaseCostByBranch: {
    branchId: string;
    costPerLiter: number;
    date: string;
    retailPricePerLiter: number | null;
  }[];
  deliveryOptions: SupplyDeliveryOption[];
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<SaleInput>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      date: editRecord ? editRecord.date.split("T")[0] : "",
      branchId: editRecord?.branch.id ?? "",
      litersSold: editRecord ? Number(editRecord.litersSold) : undefined,
      pricePerLiter: editRecord ? Number(editRecord.pricePerLiter) : undefined,
      milkSupplyId: editRecord?.milkSupplyId ?? "",
    },
  });

  const branchIdWatch = watch("branchId");
  const purchaseHint = latestPurchaseCostByBranch.find(
    (x) => x.branchId === branchIdWatch
  );

  const suppliesForBranch = useMemo(
    () => deliveryOptions.filter((d) => d.branchId === branchIdWatch),
    [deliveryOptions, branchIdWatch]
  );

  const milkSupplyRegister = register("milkSupplyId");

  const onSubmit = async (data: SaleInput) => {
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
        date:
          typeof json.date === "string"
            ? json.date
            : new Date(json.date).toISOString(),
        litersSold: json.litersSold.toString(),
        pricePerLiter: json.pricePerLiter.toString(),
        revenue: json.revenue.toString(),
        branch: json.branch,
        recordedBy: json.recordedBy,
        createdAt:
          typeof json.createdAt === "string"
            ? json.createdAt
            : new Date(json.createdAt).toISOString(),
        milkSupplyId: json.milkSupplyId ?? null,
        milkSupply: json.milkSupply
          ? {
              id: json.milkSupply.id,
              date:
                typeof json.milkSupply.date === "string"
                  ? json.milkSupply.date
                  : new Date(json.milkSupply.date).toISOString(),
            }
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
      onClose={() => {
        reset();
        onClose();
      }}
      title={editRecord ? "Edit Sale Record" : "Add Sale Record"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Date
          </label>
          <input type="date" {...register("date")} className={inputClass} />
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
          )}
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Branch
          </label>
          <select {...register("branchId")} className={inputClass}>
            <option value="">Select branch...</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="mt-1 text-xs text-red-500">
              {errors.branchId.message}
            </p>
          )}
          {purchaseHint && (
            <p className="mt-2 text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
              Latest delivery: buy at{" "}
              <strong>UGX {purchaseHint.costPerLiter.toLocaleString()} / L</strong>
              {purchaseHint.retailPricePerLiter != null && (
                <>
                  {" "}
                  · retail set at{" "}
                  <strong>UGX {purchaseHint.retailPricePerLiter.toLocaleString()} / L</strong>
                </>
              )}{" "}
              ({new Date(purchaseHint.date).toLocaleDateString()}). Other branches may still show older
              deliveries below—pick the batch you are selling from.
            </p>
          )}
        </div>

        {/* Which delivery batch (optional — defaults retail price) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Sell from which delivery? (optional)
          </label>
          <select
            className={inputClass}
            disabled={!branchIdWatch}
            {...milkSupplyRegister}
            onChange={(e) => {
              milkSupplyRegister.onChange(e);
              const id = e.target.value;
              const row = suppliesForBranch.find((s) => s.id === id);
              if (row?.retailPricePerLiter) {
                setValue("pricePerLiter", Number(row.retailPricePerLiter), {
                  shouldValidate: true,
                });
              }
            }}
          >
            <option value="">Custom price only (not linked to a batch)</option>
            {suppliesForBranch.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString()} — {Number(s.liters).toFixed(1)} L received ·
                retail{" "}
                {s.retailPricePerLiter != null
                  ? `UGX ${Number(s.retailPricePerLiter).toLocaleString()}/L`
                  : "not set on supply"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Linking a batch helps reporting; the amount charged is still liters × price below.
          </p>
        </div>

        {/* Liters Sold */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Liters Sold
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            {...register("litersSold", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 40.5"
          />
          {errors.litersSold && (
            <p className="mt-1 text-xs text-red-500">
              {errors.litersSold.message}
            </p>
          )}
        </div>

        {/* Price Per Liter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Price per Liter (UGX)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("pricePerLiter", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 1500.00"
          />
          {errors.pricePerLiter && (
            <p className="mt-1 text-xs text-red-500">
              {errors.pricePerLiter.message}
            </p>
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
              : "Add Sale"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
