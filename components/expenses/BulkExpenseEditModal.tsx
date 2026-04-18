"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Calculator, Pencil } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { EXPENSE_CATEGORIES } from "@/lib/validations/expense";

interface ExpenseLine {
  id: string;
  category: string;
  description: string;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  periodStart: string;
  periodEnd: string;
  initialRecords: ExpenseLine[];
  onSuccess: () => void;
  onError: (msg: string) => void;
  onDeleted?: (ids: string[]) => void;
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

export default function BulkExpenseEditModal({
  open,
  onClose,
  branchId,
  branchName,
  periodStart,
  periodEnd,
  initialRecords,
  onSuccess,
  onError,
  onDeleted,
}: Props) {
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>(
    initialRecords.map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      amount: r.amount,
    }))
  );
  const [newLines, setNewLines] = useState<ExpenseLine[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const total = [...expenseLines, ...newLines].reduce((sum, line) => sum + (line.amount || 0), 0);

  const addNewLine = useCallback(() => {
    setNewLines((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, category: "MISCELLANEOUS", description: "", amount: 0 },
    ]);
  }, []);

  const removeExistingLine = useCallback((id: string) => {
    setExpenseLines((prev) => prev.filter((l) => l.id !== id));
    setDeletedIds((prev) => [...prev, id]);
  }, []);

  const removeNewLine = useCallback((tempId: string) => {
    setNewLines((prev) => prev.filter((l) => l.id !== tempId));
  }, []);

  const updateExistingLine = useCallback((id: string, field: keyof ExpenseLine, value: string | number) => {
    setExpenseLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }, []);

  const updateNewLine = useCallback((tempId: string, field: keyof ExpenseLine, value: string | number) => {
    setNewLines((prev) => prev.map((l) => l.id === tempId ? { ...l, [field]: value } : l));
  }, []);

  const handleSave = async () => {
    const validExisting = expenseLines.filter((l) => l.description && l.amount > 0);
    const validNew = newLines.filter((l) => l.description && l.amount > 0);

    if (validExisting.length === 0 && validNew.length === 0) {
      onError("Please have at least one expense with description and amount");
      return;
    }

    setSaving(true);
    try {
      // Delete removed lines
      if (deletedIds.length > 0) {
        const deleteRes = await fetch(`/api/expenses/bulk?ids=${deletedIds.join(",")}`, { method: "DELETE" });
        if (!deleteRes.ok) {
          const err = await deleteRes.json();
          onError(err.error ?? "Failed to delete expenses");
          return;
        }
        onDeleted?.(deletedIds);
      }

      // Update existing lines
      if (validExisting.length > 0) {
        const updateRes = await fetch("/api/expenses/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenses: validExisting.map((l) => ({
              id: l.id,
              category: l.category,
              description: l.description,
              amount: l.amount,
            })),
            periodStart,
            periodEnd,
          }),
        });
        if (!updateRes.ok) {
          const err = await updateRes.json();
          onError(err.error ?? "Failed to update expenses");
          return;
        }
      }

      // Create new lines
      if (validNew.length > 0) {
        const createRes = await fetch("/api/expenses/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId,
            periodStart,
            periodEnd,
            paymentMethod: "CASH",
            expenses: validNew.map((l) => ({
              category: l.category,
              description: l.description,
              amount: l.amount,
            })),
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          onError(err.error ?? "Failed to add new expenses");
          return;
        }
      }

      onSuccess();
      onClose();
    } catch {
      onError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const allLines = [
    ...expenseLines.map((l) => ({ ...l, isNew: false })),
    ...newLines.map((l) => ({ ...l, isNew: true })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Expenses — ${branchName}`}
    >
      <div className="space-y-4">
        {/* Period Summary */}
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-xs text-green-700">
            <span className="font-medium">Period:</span>{" "}
            {new Date(periodStart).toLocaleDateString()} – {new Date(periodEnd).toLocaleDateString()}
          </p>
        </div>

        {/* Expense Lines */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {allLines.map((line, index) => (
            <div key={line.id} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={line.category}
                    onChange={(e) =>
                      line.isNew
                        ? updateNewLine(line.id, "category", e.target.value)
                        : updateExistingLine(line.id, "category", e.target.value)
                    }
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="UGX"
                    value={line.amount || ""}
                    onChange={(e) =>
                      line.isNew
                        ? updateNewLine(line.id, "amount", parseFloat(e.target.value) || 0)
                        : updateExistingLine(line.id, "amount", parseFloat(e.target.value) || 0)
                    }
                    className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    line.isNew
                      ? updateNewLine(line.id, "description", e.target.value)
                      : updateExistingLine(line.id, "description", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                />
              </div>
              <button
                type="button"
                onClick={() => (line.isNew ? removeNewLine(line.id) : removeExistingLine(line.id))}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addNewLine}
          className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New Expense
        </button>

        {/* Running Total */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Total</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            UGX {total.toLocaleString()}
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}