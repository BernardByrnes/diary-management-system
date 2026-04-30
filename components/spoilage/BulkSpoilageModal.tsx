"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface SpoilageLine { date: string; liters: number; reason: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  branchOptions: { id: string; name: string }[];
  onSuccess: (records: unknown[]) => void;
  onError: (msg: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function BulkSpoilageModal({ open, onClose, branchOptions, onSuccess, onError }: Props) {
  const [branchId, setBranchId] = useState("");
  const [step, setStep] = useState<"setup" | "entries">("setup");
  const [lines, setLines] = useState<SpoilageLine[]>([{ date: today(), liters: 0, reason: "" }]);
  const [saving, setSaving] = useState(false);

  const totalLiters = lines.reduce((s, l) => s + (l.liters || 0), 0);

  const addLine = useCallback(() => setLines((p) => [...p, { date: today(), liters: 0, reason: "" }]), []);
  const removeLine = useCallback((i: number) => setLines((p) => p.filter((_, idx) => idx !== i)), []);
  const updateLine = useCallback(<K extends keyof SpoilageLine>(i: number, field: K, value: SpoilageLine[K]) => {
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const handleClose = () => {
    setStep("setup"); setBranchId(""); setLines([{ date: today(), liters: 0, reason: "" }]); onClose();
  };

  const handleSave = async () => {
    const valid = lines.filter((l) => l.date && l.liters > 0 && l.reason.trim());
    if (!valid.length) { onError("Add at least one spoilage record with date, liters, and reason"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/spoilage/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, entries: valid }),
      });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "Failed to save"); } else { onSuccess(json); handleClose(); }
    } catch { onError("Something went wrong"); } finally { setSaving(false); }
  };

  const branchName = branchOptions.find((b) => b.id === branchId)?.name ?? "";
  const validCount = lines.filter((l) => l.date && l.liters > 0 && l.reason.trim()).length;

  return (
    <Modal open={open} onClose={handleClose} title={step === "setup" ? "Bulk Spoilage Records" : `Spoilage — ${branchName}`}>
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
            <p className="text-xs text-green-700"><span className="font-medium">Branch:</span> {branchName} · Records saved as Pending approval</p>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input type="date" value={line.date} onChange={(e) => updateLine(i, "date", e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  <input type="number" placeholder="Liters" value={line.liters || ""} onChange={(e) => updateLine(i, "liters", parseFloat(e.target.value) || 0)} className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
                  <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
                <input placeholder="Reason (e.g. Power outage, Contamination)" value={line.reason} onChange={(e) => updateLine(i, "reason", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
              </div>
            ))}
          </div>
          <button onClick={addLine} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"><Plus className="w-4 h-4" />Add Another Record</button>
          <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <span className="text-sm text-amber-700">Total spoiled</span>
            <span className="text-lg font-semibold text-amber-800">{totalLiters.toLocaleString()} L</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep("setup")} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>
            <button onClick={handleSave} disabled={saving || !validCount} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors">
              {saving ? "Saving…" : `Save ${validCount} Record${validCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
