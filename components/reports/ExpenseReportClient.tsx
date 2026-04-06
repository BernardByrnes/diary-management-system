"use client";

import { useState, useCallback } from "react";
import { Flag, Loader2 } from "lucide-react";

interface Expense {
  id: string;
  date: string;
  branchName: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  isFlagged: boolean;
}

interface Props {
  expenses: Expense[];
  isOwner: boolean;
  totalExpenses: number;
}

export default function ExpenseReportClient({ expenses: initial, isOwner, totalExpenses }: Props) {
  const [expenses, setExpenses] = useState(initial);
  const [flagging, setFlagging] = useState<string | null>(null);

  const handleFlag = useCallback(async (expense: Expense) => {
    setFlagging(expense.id);
    try {
      const method = expense.isFlagged ? "DELETE" : "POST";
      const res = await fetch("/api/expenses/flag", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId: expense.id }),
      });
      if (res.ok) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === expense.id ? { ...e, isFlagged: !e.isFlagged } : e))
        );
      }
    } catch {
      // silently fail
    } finally {
      setFlagging(null);
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">Expense Records</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Branch</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Description</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Method</th>
              {isOwner && (
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Flag
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="px-4 py-8 text-center text-gray-400 text-xs">
                  No expenses recorded this month
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr
                  key={e.id}
                  className={`hover:bg-gray-50/70 ${e.isFlagged ? "bg-amber-50/40" : ""}`}
                >
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(e.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{e.branchName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {e.category.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {e.description}
                    {e.isFlagged && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 text-xs">
                        <Flag className="w-3 h-3" />
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 font-medium">
                    UGX {e.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.paymentMethod === "CASH"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {e.paymentMethod === "CASH" ? "Cash" : "Bank"}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleFlag(e)}
                        disabled={flagging === e.id}
                        title={e.isFlagged ? "Remove flag" : "Flag for review"}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          e.isFlagged
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {flagging === e.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Flag className="w-3 h-3" />
                        )}
                        {e.isFlagged ? "Flagged" : "Flag"}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={isOwner ? 4 : 4} className="px-4 py-3 font-bold text-gray-900 text-xs uppercase tracking-wide">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                  UGX {totalExpenses.toLocaleString()}
                </td>
                <td colSpan={isOwner ? 2 : 1} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
