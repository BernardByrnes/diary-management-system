"use client";

import { useState, useCallback } from "react";
import { formatPeriod } from "@/lib/utils/date";
import { Plus, Trash2, Calculator } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/validations/expense";

interface ExpenseLine {
  id?: string;
  category: string;
  description: string;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  onSuccess: (newRecords: unknown[]) => void;
  onError: (msg: string) => void;
  initialBranchId?: string;
  initialPeriodPreset?: string;
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

function getPeriodDates(preset: string): { periodStart: string; periodEnd: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (preset === "first-half") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10), label: `1st–15th ${start.toLocaleString("default", { month: "short", year: "numeric" })}` };
  } else if (preset === "second-half") {
    const start = new Date(year, month, 16);
    const lastDay = new Date(year, month + 1, 0);
    const end = lastDay;
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10), label: `16th–End ${start.toLocaleString("default", { month: "short", year: "numeric" })}` };
  } else if (preset === "this-month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10), label: `Full Month ${start.toLocaleString("default", { month: "long", year: "numeric" })}` };
  } else if (preset === "last-month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10), label: `Full Month ${start.toLocaleString("default", { month: "long", year: "numeric" })}` };
  }
  // Custom - return empty strings
  return { periodStart: "", periodEnd: "", label: "Custom Range" };
}

export default function BulkExpenseModal({ open, onClose, branchOptions, onSuccess, onError, initialBranchId, initialPeriodPreset }: Props) {
  const [step, setStep] = useState<"setup" | "entries">("setup");
  const [branchId, setBranchId] = useState(initialBranchId ?? "");
  const [periodPreset, setPeriodPreset] = useState(initialPeriodPreset ?? "first-half");
  const [customPeriodStart, setCustomPeriodStart] = useState("");
  const [customPeriodEnd, setCustomPeriodEnd] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
    { category: "MISCELLANEOUS", description: "", amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const periodInfo = periodPreset === "custom"
    ? { periodStart: customPeriodStart, periodEnd: customPeriodEnd, label: "Custom Range" }
    : getPeriodDates(periodPreset);

  const total = expenseLines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const addLine = useCallback(() => {
    setExpenseLines((prev) => [...prev, { category: "MISCELLANEOUS", description: "", amount: 0 }]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setExpenseLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateLine = useCallback((index: number, field: keyof ExpenseLine, value: string | number) => {
    setExpenseLines((prev) => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  }, []);

  const handleNext = () => {
    if (!branchId) {
      onError("Please select a branch");
      return;
    }
    if (!periodInfo.periodStart || !periodInfo.periodEnd) {
      onError("Please select a valid date range");
      return;
    }
    setStep("entries");
  };

  const handleSave = async () => {
    const validLines = expenseLines.filter((l) => l.description && l.amount > 0);
    if (validLines.length === 0) {
      onError("Please add at least one expense with description and amount");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          periodStart: periodInfo.periodStart,
          periodEnd: periodInfo.periodEnd,
          paymentMethod,
          expenses: validLines.map((l) => ({
            category: l.category,
            description: l.description,
            amount: l.amount,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? "Failed to save expenses");
      } else {
        onSuccess(json);
        handleClose();
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep("setup");
    setBranchId(initialBranchId ?? "");
    setPeriodPreset(initialPeriodPreset ?? "first-half");
    setCustomPeriodStart("");
    setCustomPeriodEnd("");
    setPaymentMethod("CASH");
    setExpenseLines([{ category: "MISCELLANEOUS", description: "", amount: 0 }]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === "setup" ? "Bulk Expense Entry" : `Add Expenses — ${branchOptions.find((b) => b.id === branchId)?.name ?? ""}`}
    >
      {step === "setup" ? (
        <div className="space-y-5">
          {/* Branch Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
            >
              <option value="">Select branch...</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Period Presets */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Period</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { value: "first-half", label: "1st – 15th" },
                { value: "second-half", label: "16th – End" },
                { value: "this-month", label: "This Month" },
                { value: "last-month", label: "Last Month" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPeriodPreset(opt.value);
                    if (opt.value !== "custom") {
                      const info = getPeriodDates(opt.value);
                      setCustomPeriodStart(info.periodStart);
                      setCustomPeriodEnd(info.periodEnd);
                    }
                  }}
                  className={`px-3 py-2 text-sm rounded-xl border transition-colors ${
                    periodPreset === opt.value
                      ? "border-green-600 bg-green-50 text-green-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPeriodPreset("custom")}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                periodPreset === "custom"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Custom range
            </button>
            {periodPreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={customPeriodStart}
                    onChange={(e) => setCustomPeriodStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={customPeriodEnd}
                    onChange={(e) => setCustomPeriodEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                  />
                </div>
              </div>
            )}
            {periodInfo.periodStart && periodInfo.periodEnd && (
              <p className="text-xs text-green-600 mt-2">
                Selected: {formatPeriod(periodInfo.periodStart, periodInfo.periodEnd)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
            <div className="flex gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === pm
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={pm}
                    checked={paymentMethod === pm}
                    onChange={() => setPaymentMethod(pm)}
                    className="sr-only"
                  />
                  {pm === "CASH" ? "Cash" : "Bank Transfer"}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!branchId || !periodInfo.periodStart || !periodInfo.periodEnd}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            Continue to Add Expenses
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Period Summary */}
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <p className="text-xs text-green-700">
              <span className="font-medium">Period:</span> {formatPeriod(periodInfo.periodStart, periodInfo.periodEnd)}
              {" · "}
              <span className="font-medium">Payment:</span> {paymentMethod}
            </p>
          </div>

          {/* Expense Lines */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {expenseLines.map((line, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <select
                    value={line.category}
                    onChange={(e) => updateLine(index, "category", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Description (e.g. Fuel for delivery)"
                    value={line.description}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                  />
                  <input
                    type="number"
                    placeholder="Amount (UGX)"
                    value={line.amount || ""}
                    onChange={(e) => updateLine(index, "amount", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={expenseLines.length === 1}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Another Expense
          </button>

          {/* Running Total */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Running Total</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              UGX {total.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || expenseLines.filter((l) => l.description && l.amount > 0).length === 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
            >
              {saving ? "Saving..." : `Save ${expenseLines.filter((l) => l.description && l.amount > 0).length} Expense${expenseLines.filter((l) => l.description && l.amount > 0).length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}