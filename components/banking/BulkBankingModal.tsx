"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface DepositLine {
  bankName: string;
  referenceNumber: string;
  amount: number;
  hasDiscrepancy: boolean;
  discrepancyNote: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  onSuccess: (records: unknown[]) => void;
  onError: (msg: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function BulkBankingModal({ open, onClose, branchOptions, onSuccess, onError }: Props) {
  const [step, setStep] = useState<"setup" | "entries">("setup");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<DepositLine[]>([{ bankName: "", referenceNumber: "", amount: 0, hasDiscrepancy: false, discrepancyNote: "" }]);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  const addLine = useCallback(() => setLines((p) => [...p, { bankName: "", referenceNumber: "", amount: 0, hasDiscrepancy: false, discrepancyNote: "" }]), []);
  const removeLine = useCallback((i: number) => setLines((p) => p.filter((_, idx) => idx !== i)), []);
  const updateLine = useCallback(<K extends keyof DepositLine>(i: number, field: K, value: DepositLine[K]) => {
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const handleClose = () => {
    setStep("setup"); setBranchId(""); setDate(today());
    setLines([{ bankName: "", referenceNumber: "", amount: 0, hasDiscrepancy: false, discrepancyNote: "" }]);
    onClose();
  };

  const handleSave = async () => {
    const valid = lines.filter((l) => l.bankName && l.referenceNumber && l.amount > 0);
    if (!valid.length) { onError("Add at least one deposit with bank name, reference, and amount"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/banking/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, date, deposits: valid.map((l) => ({ bankName: l.bankName, referenceNumber: l.referenceNumber, amount: l.amount, hasDiscrepancy: l.hasDiscrepancy, discrepancyNote: l.discrepancyNote || null })) }),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "Failed to save"); } else { onSuccess(json); handleClose(); }
    } catch { onError("Something went wrong"); } finally { setSaving(false); }
  };

  const branchName = branchOptions.find((b) => b.id === branchId)?.name ?? "";

  return (
    <Modal open={open} onClose={handleClose} title={step === "setup" ? "Bulk Bank Deposits" : `Deposits — ${branchName}`}>
      {step === "setup" ? (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
              <option value="">Select branch…</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
          </div>
          <button onClick={() => { if (!branchId) { onError("Select a branch"); return; } setStep("entries"); }} disabled={!branchId || !date} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
            Continue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
            <p className="text-xs text-green-700"><span className="font-medium">Branch:</span> {branchName} · <span className="font-medium">Date:</span> {date}</p>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input placeholder="Bank name" value={line.bankName} onChange={(e) => updateLine(i, "bankName", e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
                <input placeholder="Reference number" value={line.referenceNumber} onChange={(e) => updateLine(i, "referenceNumber", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                <input type="number" placeholder="Amount (UGX)" value={line.amount || ""} onChange={(e) => updateLine(i, "amount", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={line.hasDiscrepancy} onChange={(e) => updateLine(i, "hasDiscrepancy", e.target.checked)} className="rounded" />
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Mark discrepancy
                </label>
                {line.hasDiscrepancy && (
                  <input placeholder="Discrepancy note" value={line.discrepancyNote} onChange={(e) => updateLine(i, "discrepancyNote", e.target.value)} className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300" />
                )}
              </div>
            ))}
          </div>
          <button onClick={addLine} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"><Plus className="w-4 h-4" />Add Another Deposit</button>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">Total</span></div>
            <span className="text-lg font-semibold text-gray-900">UGX {total.toLocaleString()}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep("setup")} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>
            <button onClick={handleSave} disabled={saving || !lines.filter((l) => l.bankName && l.referenceNumber && l.amount > 0).length} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
              {saving ? "Saving…" : `Save ${lines.filter((l) => l.bankName && l.referenceNumber && l.amount > 0).length} Deposit(s)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
