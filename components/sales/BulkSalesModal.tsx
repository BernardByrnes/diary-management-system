"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface SaleLine { date: string; litersSold: number; pricePerLiter: number; }

interface Props {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  onSuccess: (records: unknown[]) => void;
  onError: (msg: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function BulkSalesModal({ open, onClose, branchOptions, onSuccess, onError }: Props) {
  const [branchId, setBranchId] = useState("");
  const [step, setStep] = useState<"setup" | "entries">("setup");
  const [lines, setLines] = useState<SaleLine[]>([{ date: today(), litersSold: 0, pricePerLiter: 0 }]);
  const [saving, setSaving] = useState(false);

  const totalRevenue = lines.reduce((s, l) => s + (l.litersSold * l.pricePerLiter), 0);

  const addLine = useCallback(() => setLines((p) => [...p, { date: today(), litersSold: 0, pricePerLiter: 0 }]), []);
  const removeLine = useCallback((i: number) => setLines((p) => p.filter((_, idx) => idx !== i)), []);
  const updateLine = useCallback(<K extends keyof SaleLine>(i: number, field: K, value: SaleLine[K]) => {
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const handleClose = () => {
    setStep("setup"); setBranchId(""); setLines([{ date: today(), litersSold: 0, pricePerLiter: 0 }]); onClose();
  };

  const handleSave = async () => {
    const valid = lines.filter((l) => l.date && l.litersSold > 0 && l.pricePerLiter > 0);
    if (!valid.length) { onError("Add at least one sale with date, liters, and price"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/sales/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, entries: valid }),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "Failed to save"); } else { onSuccess(json); handleClose(); }
    } catch { onError("Something went wrong"); } finally { setSaving(false); }
  };

  const branchName = branchOptions.find((b) => b.id === branchId)?.name ?? "";
  const validCount = lines.filter((l) => l.date && l.litersSold > 0 && l.pricePerLiter > 0).length;

  return (
    <Modal open={open} onClose={handleClose} title={step === "setup" ? "Bulk Sales Entry" : `Sales — ${branchName}`}>
      {step === "setup" ? (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
              <option value="">Select branch…</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button onClick={() => { if (!branchId) { onError("Select a branch"); return; } setStep("entries"); }} disabled={!branchId} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
            Continue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
            <p className="text-xs text-green-700"><span className="font-medium">Branch:</span> {branchName}</p>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input type="date" value={line.date} onChange={(e) => updateLine(i, "date", e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Liters sold</label>
                    <input type="number" placeholder="0" value={line.litersSold || ""} onChange={(e) => updateLine(i, "litersSold", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price / liter (UGX)</label>
                    <input type="number" placeholder="0" value={line.pricePerLiter || ""} onChange={(e) => updateLine(i, "pricePerLiter", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  </div>
                </div>
                {line.litersSold > 0 && line.pricePerLiter > 0 && (
                  <p className="text-xs text-green-600 font-medium">Revenue: UGX {(line.litersSold * line.pricePerLiter).toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
          <button onClick={addLine} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"><Plus className="w-4 h-4" />Add Another Sale</button>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">Total Revenue</span></div>
            <span className="text-lg font-semibold text-gray-900">UGX {totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep("setup")} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>
            <button onClick={handleSave} disabled={saving || !validCount} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
              {saving ? "Saving…" : `Save ${validCount} Sale${validCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
