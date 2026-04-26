"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils/date";
import { Plus, Search, Pencil, Trash2, FileText, Droplets } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import {
  milkSupplySchema,
  updateMilkSupplySchema,
  type MilkSupplyInput,
} from "@/lib/validations/milk-supply";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface MilkSupplyRecord {
  id: string;
  date: string;
  liters: string;
  costPerLiter: string;
  totalCost: string;
  retailPricePerLiter: string;
  deliveryReference: string | null;
  branch: { id: string; name: string };
  supplier: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  createdAt: string;
}

interface Props {
  initialRecords: MilkSupplyRecord[];
  branchOptions: { id: string; name: string }[];
  supplierOptions: { id: string; name: string }[];
  userRole: string;
  managedBranchIds: string[];
}

let toastCounter = 0;

export default function MilkSupplyClient({
  initialRecords,
  branchOptions,
  supplierOptions,
  userRole,
  managedBranchIds,
}: Props) {
  const [records, setRecords] = useState<MilkSupplyRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MilkSupplyRecord | null>(null);

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
    const matchSearch =
      r.branch.name.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier.name.toLowerCase().includes(search.toLowerCase());
    const rDate = r.date.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo = !dateTo || rDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  async function handleDelete(record: MilkSupplyRecord) {
    if (
      !confirm(
        `Delete milk supply record for ${record.supplier.name} on ${formatDate(record.date)}?`
      )
    )
      return;

    const res = await fetch(`/api/milk-supply/${record.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      addToast("success", "Record deleted successfully");
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Failed to delete record");
    }
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          <p className="font-medium text-teal-950">Cooperative milk &amp; branch settlement</p>
          <p className="mt-1 text-teal-900/90 leading-relaxed">
            Each <strong>delivery</strong> needs buy cost <strong>and</strong> the{" "}
            <strong>retail price per liter</strong> ED wants for that batch (change when a new delivery
            arrives—past sales keep their recorded prices). Branches can differ: e.g. main branch on
            fresh stock at a new retail while others still sell older stock at an older price.
          </p>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by branch or supplier..."
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
                    { key: "supplier" as const, label: "Supplier" },
                    { key: "liters" as const, label: "Liters" },
                    { key: "costPerLiter" as const, label: "Cost/Liter (UGX)" },
                    { key: "retailPricePerLiter" as const, label: "Retail/L (UGX)" },
                    { key: "totalCost" as const, label: "Total Cost (UGX)" },
                    { key: "recordedBy" as const, label: "Recorded By" },
                  ],
                  filtered.map((r) => ({
                    date: formatDate(r.date),
                    branch: r.branch.name,
                    supplier: r.supplier.name,
                    liters: r.liters,
                    costPerLiter: r.costPerLiter,
                    retailPricePerLiter: r.retailPricePerLiter,
                    totalCost: r.totalCost,
                    recordedBy: r.recordedBy.fullName,
                  }))
                );
                downloadCSV("milk-supply.csv", csv);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              title="Export CSV"
            >
              <FileText className="w-4 h-4 text-green-700" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <PdfButton
              title="Milk Supply Records"
              filename="milk-supply.pdf"
              columns={[
                { key: "date", label: "Date" },
                { key: "branch", label: "Branch" },
                { key: "supplier", label: "Supplier" },
                { key: "liters", label: "Liters" },
                { key: "costPerLiter", label: "Cost/Liter (UGX)" },
                { key: "retailPricePerLiter", label: "Retail/L (UGX)" },
                { key: "totalCost", label: "Total Cost (UGX)" },
                { key: "recordedBy", label: "Recorded By" },
              ]}
              rows={filtered.map((r) => ({
                date: formatDate(r.date),
                branch: r.branch.name,
                supplier: r.supplier.name,
                liters: r.liters,
                costPerLiter: r.costPerLiter,
                retailPricePerLiter: r.retailPricePerLiter,
                totalCost: r.totalCost,
                recordedBy: r.recordedBy.fullName,
              }))}
            />
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Record
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
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Supplier
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Liters
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Cost/L
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Retail/L
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Total Cost
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                        <Droplets className="w-6 h-6 text-teal-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search ? "No records match your search" : "No milk supply records yet"}
                      </p>
                      {!search && (
                        <p className="text-xs text-gray-400 mt-1">
                          Start recording deliveries using the button above.
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
                        {formatDate(r.date)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                      {r.branch.name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {r.supplier.name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-right">
                      {Number(r.liters).toFixed(1)} L
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-right hidden lg:table-cell">
                      UGX {Number(r.costPerLiter).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-right hidden lg:table-cell">
                      {r.retailPricePerLiter && Number(r.retailPricePerLiter) > 0
                        ? `UGX ${Number(r.retailPricePerLiter).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900 text-right">
                      UGX {Number(r.totalCost).toLocaleString()}
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
      <MilkSupplyFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        supplierOptions={supplierOptions}
        userRole={userRole}
        managedBranchIds={managedBranchIds}
        onSuccess={(record) => {
          setRecords((prev) => [record, ...prev]);
          setAddOpen(false);
          addToast("success", "Milk supply record added");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <MilkSupplyFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          editRecord={editTarget}
          branchOptions={branchOptions}
          supplierOptions={supplierOptions}
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
    </>
  );
}

function MilkSupplyFormModal({
  open,
  onClose,
  editRecord,
  branchOptions,
  supplierOptions,
  userRole,
  managedBranchIds,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: MilkSupplyRecord;
  branchOptions: { id: string; name: string }[];
  supplierOptions: { id: string; name: string }[];
  userRole: string;
  managedBranchIds: string[];
  onSuccess: (record: MilkSupplyRecord) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MilkSupplyInput>({
    resolver: zodResolver(
      editRecord ? updateMilkSupplySchema : milkSupplySchema
    ) as Resolver<MilkSupplyInput>,
    defaultValues: {
      date: editRecord ? editRecord.date.split("T")[0] : "",
      branchId: editRecord?.branch.id ?? "",
      supplierId: editRecord?.supplier.id ?? "",
      liters: editRecord ? Number(editRecord.liters) : undefined,
      costPerLiter: editRecord ? Number(editRecord.costPerLiter) : undefined,
      retailPricePerLiter: editRecord ? Number(editRecord.retailPricePerLiter) : undefined,
      deliveryReference: editRecord?.deliveryReference ?? "",
    },
  });

  const onSubmit = async (data: MilkSupplyInput) => {
    if (userRole === "MANAGER" && data.branchId && !managedBranchIds.includes(data.branchId)) {
      onError("You are not authorized to record supply for this branch.");
      return;
    }

    const url = editRecord
      ? `/api/milk-supply/${editRecord.id}`
      : "/api/milk-supply";
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
      const record: MilkSupplyRecord = {
        id: json.id,
        date: typeof json.date === "string" ? json.date : new Date(json.date).toISOString(),
        liters: json.liters.toString(),
        costPerLiter: json.costPerLiter.toString(),
        totalCost: json.totalCost.toString(),
        retailPricePerLiter: json.retailPricePerLiter?.toString?.() ?? "0",
        deliveryReference: json.deliveryReference ?? null,
        branch: json.branch,
        supplier: json.supplier,
        recordedBy: json.recordedBy,
        createdAt: typeof json.createdAt === "string" ? json.createdAt : new Date(json.createdAt).toISOString(),
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
      title={editRecord ? "Edit Milk Supply Record" : "Add Milk Supply Record"}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
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
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Supplier
          </label>
          <select {...register("supplierId")} className={inputClass}>
            <option value="">Select supplier...</option>
            {supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="mt-1 text-xs text-red-500">
              {errors.supplierId.message}
            </p>
          )}
        </div>

        {/* Liters */}
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
            placeholder="e.g. 50.5"
          />
          {errors.liters && (
            <p className="mt-1 text-xs text-red-500">{errors.liters.message}</p>
          )}
        </div>

        {/* Cost Per Liter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Cost per Liter (UGX)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("costPerLiter", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 1200.00"
          />
          {errors.costPerLiter && (
            <p className="mt-1 text-xs text-red-500">
              {errors.costPerLiter.message}
            </p>
          )}
        </div>

        {/* Retail per liter — default for sales from this batch */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Retail price per Liter (UGX)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("retailPricePerLiter", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 1900.00"
          />
          {errors.retailPricePerLiter && (
            <p className="mt-1 text-xs text-red-500">
              {errors.retailPricePerLiter.message as string}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            ED sets this for each delivery. Sales can still use a different price (e.g. discount); past
            sales are never recalculated when you change the next delivery&apos;s retail.
          </p>
        </div>

        {/* Delivery Reference (GRN) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Delivery Reference{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            {...register("deliveryReference")}
            className={inputClass}
            placeholder="e.g. GRN-2024-0042"
          />
          <p className="mt-1 text-xs text-gray-400">
            Supplier delivery note or GRN number for traceability.
          </p>
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
              : "Add Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
