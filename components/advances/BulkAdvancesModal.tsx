"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface AdvanceLine { date: string; amount: number; purpose: string; recipientType: "SUPPLIER" | "OWNER"; supplierId: string; ownerId: string; branchId: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  supplierOptions: { id: string; name: string }[];
  ownerOptions: { id: string; fullName: string }[];
  branchOptions: { id: string; name: string }[];
  onSuccess: (records: unknown[]) => void;
  onError: (msg: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = (): AdvanceLine => ({ date: today(), amount: 0, purpose: "", recipientType: "SUPPLIER", supplierId: "", ownerId: "", branchId: "" });

export default function BulkAdvancesModal({ open, onClose, supplierOptions, ownerOptions, branchOptions, onSuccess, onError }: Props) {
  const [lines, setLines] = useState<AdvanceLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  const addLine = useCallback(() => setLines((p) => [...p, emptyLine()]), []);
  const removeLine = useCallback((i: number) => setLines((p) => p.filter((_, idx) => idx !== i)), []);
  const updateLine = useCallback(<K extends keyof AdvanceLine>(i: number, field: K, value: AdvanceLine[K]) => {
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const handleClose = () => { setLines([emptyLine()]); onClose(); };

  const isValid = (l: AdvanceLine) => l.date && l.amount > 0 && l.purpose.trim() && (l.recipientType === "SUPPLIER" ? l.supplierId : l.ownerId);

  const handleSave = async () => {
    const valid = lines.filter(isValid);
    if (!valid.length) { onError("Each advance needs a date, amount, purpose, and recipient"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/advances/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: valid.map((l) => ({
            date: l.date,
            amount: l.amount,
            purpose: l.purpose,
            recipientType: l.recipientType,
            supplierId: l.recipientType === "SUPPLIER" ? l.supplierId : undefined,
            ownerId: l.recipientType === "OWNER" ? l.ownerId : undefined,
            branchId: l.branchId || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "Failed to save"); } else { onSuccess(json); handleClose(); }
    } catch { onError("Something went wrong"); } finally { setSaving(false); }
  };

  const validCount = lines.filter(isValid).length;

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Advances">
      <div className="space-y-4">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {lines.map((line, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input type="date" value={line.date} onChange={(e) => updateLine(i, "date", e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Recipient type</label>
                  <select value={line.recipientType} onChange={(e) => updateLine(i, "recipientType", e.target.value as "SUPPLIER" | "OWNER")} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
                    <option value="SUPPLIER">Supplier</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{line.recipientType === "SUPPLIER" ? "Supplier" : "Owner"}</label>
                  {line.recipientType === "SUPPLIER" ? (
                    <select value={line.supplierId} onChange={(e) => updateLine(i, "supplierId", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
                      <option value="">Select…</option>
                      {supplierOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <select value={line.ownerId} onChange={(e) => updateLine(i, "ownerId", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
                      <option value="">Select…</option>
                      {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <input type="number" placeholder="Amount (UGX)" value={line.amount || ""} onChange={(e) => updateLine(i, "amount", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
              <input placeholder="Purpose" value={line.purpose} onChange={(e) => updateLine(i, "purpose", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Branch (optional)</label>
                <select value={line.branchId} onChange={(e) => updateLine(i, "branchId", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
                  <option value="">No specific branch</option>
                  {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLine} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"><Plus className="w-4 h-4" />Add Another Advance</button>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">Total</span></div>
          <span className="text-lg font-semibold text-gray-900">UGX {total.toLocaleString()}</span>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !validCount} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
            {saving ? "Saving…" : `Save ${validCount} Advance${validCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
