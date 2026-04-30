"use client";

import { useState, useRef } from "react";
import type { ImportPreview, AutoImportPreview, ParsedRow } from "@/app/api/import/route";
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";

// ── Template generator ────────────────────────────────────────────────────────

function downloadTemplate(branchNames: string[]) {
  const header = "Branch Name,Period,Item Type,Details,Qty (Litres),Total (UGX),Rate per Litre";
  const period = "Apr 1-15";
  const rows = branchNames.flatMap((b) => [
    `${b},${period},Expense,Staff meals (MEALS),,250000,`,
    `${b},${period},Expense,Transport (TRANSPORT),,100000,`,
    `${b},${period},Milk,Milk supply from farmers,1200,,1200`,
    `${b},${period},Sale,Sales revenue,900,1350000,`,
  ]);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Column definitions for preview tables ────────────────────────────────────

type GroupType = "expenses" | "milk" | "sales";

const COLUMN_DEFS: Record<GroupType, string[]> = {
  expenses: ["branch_name", "date", "period_start", "period_end", "category", "description", "amount", "payment_method"],
  milk: ["branch_name", "date", "period_end", "liters", "cost_per_liter"],
  sales: ["branch_name", "date", "period_end", "liters_sold", "price_per_liter", "revenue"],
};

const GROUP_LABELS: Record<GroupType, string> = {
  expenses: "Expenses",
  milk: "Milk Deliveries",
  sales: "Sales",
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ColumnMapping({ mapping }: { mapping: Record<string, string> }) {
  if (!Object.keys(mapping).length) return null;
  return (
    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
      <p className="font-medium text-gray-600 mb-1">Column mapping:</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(mapping).map(([orig, mapped]) => (
          <span key={orig} className="inline-flex items-center gap-1">
            <span className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">{orig}</span>
            <span className="text-gray-400">→</span>
            <span className="font-mono text-violet-600">{mapped}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RowsTable({ rows, type }: { rows: ParsedRow[]; type: GroupType }) {
  const columns = COLUMN_DEFS[type];
  if (!rows.length) return <p className="text-xs text-gray-400 italic">No {GROUP_LABELS[type].toLowerCase()} rows found.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 font-medium w-8">#</th>
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 text-gray-500 font-medium">{col}</th>
            ))}
            <th className="text-left px-3 py-2 text-gray-500 font-medium">status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            const hasError = row._errors.length > 0;
            return (
              <tr key={row._row} className={hasError ? "bg-red-50" : "hover:bg-gray-50"}>
                <td className="px-3 py-2 text-gray-400">{row._row}</td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">
                    {row[col] != null ? String(row[col]) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2">
                  {hasError ? (
                    <span className="flex items-start gap-1 text-red-500">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{row._errors.join("; ")}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />OK
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupSection({ type, group }: { type: GroupType; group: { rows: ParsedRow[]; columnMapping: Record<string, string> } }) {
  const valid = group.rows.filter((r) => r._errors.length === 0).length;
  const errors = group.rows.filter((r) => r._errors.length > 0).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-700">{GROUP_LABELS[type]}</h3>
        {valid > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />{valid} ready
          </span>
        )}
        {errors > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-medium">
            <XCircle className="w-3 h-3" />{errors} errors (skipped)
          </span>
        )}
      </div>
      <ColumnMapping mapping={group.columnMapping} />
      <RowsTable rows={group.rows} type={type} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  branchNames: string[];
}

export default function ImportClient({ branchNames }: Props) {
  const [csvText, setCsvText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<AutoImportPreview | null>(null);
  const [result, setResult] = useState<{ inserted: number; breakdown?: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setCsvText("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleParse() {
    if (!csvText.trim()) { setError("Please upload a file or paste CSV content."); return; }
    setParsing(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "auto", csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Parse failed.");
      else setPreview(data as AutoImportPreview);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          confirm: true,
          groups: {
            expenses: preview.groups.expenses?.rows.filter((r) => r._errors.length === 0),
            milk: preview.groups.milk?.rows.filter((r) => r._errors.length === 0),
            sales: preview.groups.sales?.rows.filter((r) => r._errors.length === 0),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Import failed.");
      else { setResult(data); setPreview(null); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  const validCount = preview
    ? (preview.groups.expenses?.rows.filter((r) => r._errors.length === 0).length ?? 0)
    + (preview.groups.milk?.rows.filter((r) => r._errors.length === 0).length ?? 0)
    + (preview.groups.sales?.rows.filter((r) => r._errors.length === 0).length ?? 0)
    : 0;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Import complete</h3>
          <p className="text-sm text-gray-500 mt-1">
            {result.inserted} record{result.inserted !== 1 ? "s" : ""} saved successfully
          </p>
          {result.breakdown && (
            <div className="flex gap-5 justify-center mt-2 text-xs text-gray-500">
              {Object.entries(result.breakdown).filter(([, v]) => v > 0).map(([k, v]) => (
                <span key={k}>{GROUP_LABELS[k as GroupType] ?? k}: <strong className="text-gray-700">{v}</strong></span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={reset}
          className="mt-2 px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Import another file
        </button>
      </div>
    );
  }

  // ── Upload screen ───────────────────────────────────────────────────────────
  if (!preview) {
    return (
      <div className="space-y-4">
        {/* Template download */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 text-violet-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-violet-800">Download the template first</p>
              <p className="text-xs text-violet-600 mt-0.5">
                Branch names are pre-filled correctly — just add your data
              </p>
            </div>
            <button
              onClick={() => downloadTemplate(branchNames)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>

          {/* Branch names reference */}
          <div className="mt-3 px-1">
            <p className="text-xs text-gray-400 mb-1.5">Active branches in this system:</p>
            <div className="flex flex-wrap gap-2">
              {branchNames.map((name) => (
                <span key={name} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Upload your file</h2>

          <div
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-600">
              {csvText
                ? `File loaded (${csvText.split("\n").filter(Boolean).length - 1} data rows)`
                : "Click to select a CSV file"}
            </span>
            <span className="text-xs text-gray-400">Max 300 rows per upload</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </div>

          <details className="group">
            <summary className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer select-none">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Or paste CSV text directly
            </summary>
            <textarea
              className="mt-2 w-full h-36 text-xs font-mono border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Paste your CSV content here…"
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setError(null); }}
            />
          </details>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={parsing || !csvText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {parsing
              ? <><Loader2 className="w-4 h-4 animate-spin" />AI is reading your file…</>
              : <><Upload className="w-4 h-4" />Parse with AI</>}
          </button>
        </div>
      </div>
    );
  }

  // ── Preview screen ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Review parsed data</h2>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Start over</button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />{validCount} ready to import
        </span>
        {preview.errorRows > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
            <XCircle className="w-3.5 h-3.5" />{preview.errorRows} rows with errors (will be skipped)
          </span>
        )}
      </div>

      {/* Group sections */}
      <div className="space-y-6 divide-y divide-gray-100">
        {(["expenses", "milk", "sales"] as GroupType[]).map((t) => {
          const group = preview.groups[t];
          if (!group || group.rows.length === 0) return null;
          return (
            <div key={t} className="pt-5 first:pt-0">
              <GroupSection type={t} group={group} />
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming || validCount === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {confirming
            ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</>
            : <><CheckCircle2 className="w-4 h-4" />Import {validCount} record{validCount !== 1 ? "s" : ""}</>}
        </button>
      </div>
    </div>
  );
}
