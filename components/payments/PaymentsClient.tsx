"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Banknote, FileText, RefreshCw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface PaymentRecord {
  id: string;
  grossAmount: string;
  advanceDeductions: string;
  netAmount: string;
  paidAmount: string;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  supplier: { id: string; name: string };
  createdAt: string;
}

interface SupplierSummary {
  id: string;
  name: string;
  totalDeliveries: number;
  totalPaid: number;
  advances: number;
  balance: number;
}

interface Props {
  initialPayments: PaymentRecord[];
  supplierSummaries: SupplierSummary[];
}

const paySchema = z.object({
  amountPaid: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentReference: z.string().optional(),
});

type PayInput = z.infer<typeof paySchema>;

const inputClass =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400";

let toastCounter = 0;

function fmt(value: number) {
  return `UGX ${value.toLocaleString()}`;
}

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function PaymentsClient({ initialPayments, supplierSummaries: initialSummaries }: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [summaries, setSummaries] = useState<SupplierSummary[]>(initialSummaries);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [payTarget, setPayTarget] = useState<SupplierSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setPayments(initialPayments); }, [initialPayments]);
  useEffect(() => { setSummaries(initialSummaries); }, [initialSummaries]);

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

  const filtered = payments.filter((p) =>
    p.supplier.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-8">

        {/* ── Outstanding Balances ─────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Outstanding Balances</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {summaries.length} supplier{summaries.length !== 1 ? "s" : ""} owed
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {summaries.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">All suppliers are paid up</p>
              <p className="text-xs text-gray-400 mt-1">No outstanding balances</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaries.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Supplier</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total deliveries</span>
                      <span className="font-mono text-gray-700">{fmt(s.totalDeliveries)}</span>
                    </div>
                    {s.totalPaid > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Already paid</span>
                        <span className="font-mono text-green-600">− {fmt(s.totalPaid)}</span>
                      </div>
                    )}
                    {s.advances > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Advance deductions</span>
                        <span className="font-mono text-amber-600">− {fmt(s.advances)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                      <span className="font-semibold text-gray-800 text-sm">Balance due</span>
                      <span className="font-mono font-bold text-green-700 text-base">{fmt(s.balance)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setPayTarget(s)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Banknote className="w-4 h-4" />
                    Record Payment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Payment History ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 w-44"
                />
              </div>
              <button
                onClick={() => {
                  const csv = generateCSV(
                    [
                      { key: "supplier" as const, label: "Supplier" },
                      { key: "paidAmount" as const, label: "Amount Paid (UGX)" },
                      { key: "advanceDeductions" as const, label: "Advances Deducted (UGX)" },
                      { key: "paymentMethod" as const, label: "Method" },
                      { key: "paymentReference" as const, label: "Reference" },
                      { key: "paidAt" as const, label: "Paid On" },
                    ],
                    filtered.map((r) => ({
                      supplier: r.supplier.name,
                      paidAmount: r.paidAmount,
                      advanceDeductions: r.advanceDeductions,
                      paymentMethod: r.paymentMethod ?? "",
                      paymentReference: r.paymentReference ?? "",
                      paidAt: r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
                    }))
                  );
                  downloadCSV("supplier-payments.csv", csv);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                title="Export CSV"
              >
                <FileText className="w-4 h-4 text-green-700" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <PdfButton
                title="Supplier Payment History"
                filename="supplier-payments.pdf"
                columns={[
                  { key: "supplier", label: "Supplier" },
                  { key: "paidAmount", label: "Amount Paid (UGX)" },
                  { key: "advanceDeductions", label: "Advances Deducted (UGX)" },
                  { key: "paymentMethod", label: "Method" },
                  { key: "paymentReference", label: "Reference" },
                  { key: "paidAt", label: "Paid On" },
                ]}
                rows={filtered.map((r) => ({
                  supplier: r.supplier.name,
                  paidAmount: r.paidAmount,
                  advanceDeductions: r.advanceDeductions,
                  paymentMethod: r.paymentMethod ?? "",
                  paymentReference: r.paymentReference ?? "",
                  paidAt: r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
                }))}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Supplier</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Amount Paid</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Advances Deducted</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">Paid On</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Method</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                      {search ? "No payments match your search" : "No payments recorded yet"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{record.supplier.name}</td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-gray-900 text-xs">
                        {fmt(safeNum(record.paidAmount))}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-amber-600 hidden md:table-cell">
                        {safeNum(record.advanceDeductions) > 0
                          ? `− ${fmt(safeNum(record.advanceDeductions))}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs hidden sm:table-cell">
                        {record.paidAt ? new Date(record.paidAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs hidden md:table-cell">
                        {record.paymentMethod ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                        {record.paymentReference ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {payments.length > 0 && (
            <p className="text-xs text-gray-400 px-1 mt-1.5">
              Showing {filtered.length} of {payments.length}
            </p>
          )}
        </div>
      </div>

      {payTarget && (
        <RecordPaymentModal
          open
          supplier={payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={(newPayment) => {
            setPayments((prev) => [newPayment, ...prev]);
            setSummaries((prev) =>
              prev
                .map((s) => {
                  if (s.id !== payTarget.id) return s;
                  const newTotalPaid = s.totalPaid + safeNum(newPayment.paidAmount);
                  const newBalance = Math.max(0, s.totalDeliveries - newTotalPaid);
                  return { ...s, totalPaid: newTotalPaid, advances: 0, balance: newBalance };
                })
                .filter((s) => s.balance > 0)
            );
            setPayTarget(null);
            addToast(
              "success",
              `Payment of ${fmt(safeNum(newPayment.paidAmount))} recorded for ${newPayment.supplier.name}`
            );
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </>
  );
}

function RecordPaymentModal({
  open,
  supplier,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  supplier: SupplierSummary;
  onClose: () => void;
  onSuccess: (record: PaymentRecord) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PayInput>({
    resolver: zodResolver(paySchema),
    defaultValues: { amountPaid: supplier.balance },
  });

  const amountPaid = watch("amountPaid");
  const afterBalance = Math.max(0, supplier.balance - safeNum(amountPaid));
  const isFullPayment = safeNum(amountPaid) >= supplier.balance - 0.01;

  const onSubmit = async (data: PayInput) => {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: supplier.id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      onSuccess(json);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={`Pay ${supplier.name}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Balance breakdown */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total deliveries</span>
            <span className="font-mono text-gray-700">{fmt(supplier.totalDeliveries)}</span>
          </div>
          {supplier.totalPaid > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Already paid</span>
              <span className="font-mono text-green-600">− {fmt(supplier.totalPaid)}</span>
            </div>
          )}
          {supplier.advances > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Advance deductions</span>
              <span className="font-mono text-amber-600">− {fmt(supplier.advances)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-gray-800">Balance due</span>
            <span className="font-mono font-bold text-green-700">{fmt(supplier.balance)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Amount to pay (UGX)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            max={supplier.balance}
            {...register("amountPaid", { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.amountPaid && (
            <p className="mt-1 text-xs text-red-500">{errors.amountPaid.message}</p>
          )}
        </div>

        {/* After-payment preview */}
        <div className={`rounded-xl px-4 py-2.5 text-xs ${isFullPayment ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          {isFullPayment ? (
            "Full payment — balance clears to zero."
          ) : (
            <div className="flex justify-between">
              <span>Remaining after this payment</span>
              <span className="font-mono font-semibold">{fmt(afterBalance)}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
          <input
            {...register("paymentMethod")}
            className={inputClass}
            placeholder="e.g. Bank Transfer, Cash, Mobile Money"
          />
          {errors.paymentMethod && (
            <p className="mt-1 text-xs text-red-500">{errors.paymentMethod.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Reference <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register("paymentReference")}
            className={inputClass}
            placeholder="Transaction ID or reference number"
          />
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
            {isSubmitting ? "Recording..." : isFullPayment ? "Pay in Full" : "Record Partial Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
