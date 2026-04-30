"use client";

import { useState, useRef } from "react";
import type { ImportType, ImportPreview, ParsedRow } from "@/app/api/import/route";
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

// ── CSV templates ────────────────────────────────────────────────────────────

const TEMPLATES: Record<ImportType, { filename: string; headers: string; example: string }> = {
  expenses: {
    filename: "expenses_template.csv",
    headers: "branch_name,date,category,description,amount,payment_method,receipt_reference,period_start,period_end",
    example: "Kyabugimbi,2026-04-30,SALARIES,Staff salaries,500000,CASH,,2026-04-01,2026-04-30",
  },
  milk: {
    filename: "milk_template.csv",
    headers: "branch_name,supplier_name,date,liters,cost_per_liter,retail_price_per_liter,delivery_reference",
    example: "Kyabugimbi,John Doe,2026-04-30,100,1200,1500,DEL-001",
  },
  sales: {
    filename: "sales_template.csv",
    headers: "branch_name,date,liters_sold,price_per_liter",
    example: "Kyabugimbi,2026-04-30,80,1500",
  },
};

function downloadTemplate(type: ImportType) {
  const t = TEMPLATES[type];
  const content = `${t.headers}\n${t.example}\n`;
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ImportType, string> = {
  expenses: "Expenses",
  milk: "Milk Deliveries",
  sales: "Sales",
};

const COLUMN_DEFS: Record<ImportType, string[]> = {
  expenses: ["branch_name", "date", "category", "description", "amount", "payment_method"],
  milk: ["branch_name", "supplier_name", "date", "liters", "cost_per_liter"],
  sales: ["branch_name", "date", "liters_sold", "price_per_liter"],
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [type, setType] = useState<ImportType>("expenses");
  const [csvText, setCsvText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<{ inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setCsvText("");
  }

  function handleTypeChange(t: ImportType) {
    setType(t);
    reset();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleParse() {
    if (!csvText.trim()) {
      setError("Please upload a CSV file or paste CSV content.");
      return;
    }
    setParsing(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Parse failed.");
      } else {
        setPreview(data as ImportPreview);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) {
      setError("No valid rows to import.");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, confirm: true, rows: preview.rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
      } else {
        setResult(data as { inserted: number });
        setPreview(null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  const validCount = preview?.rows.filter((r) => r._errors.length === 0).length ?? 0;
  const errorCount = preview?.errorRows ?? 0;
  const columns = COLUMN_DEFS[type];

  return (
    <div className="space-y-6">
      {/* ── Type selector ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">1. Choose import type</h2>
        <div className="flex gap-3 flex-wrap">
          {(["expenses", "milk", "sales"] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                type === t
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Template download */}
        <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
          <FileSpreadsheet className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-sm text-violet-700">
            Download the template to see the expected column format
          </span>
          <button
            onClick={() => downloadTemplate(type)}
            className="ml-auto flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
        </div>
      </div>

      {/* ── Upload / paste ── */}
      {!result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">2. Upload your file</h2>

          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-600">
              {csvText
                ? `File loaded (${csvText.split("\n").length - 1} data rows)`
                : "Click to select a CSV or Excel-exported CSV file"}
            </span>
            <span className="text-xs text-gray-400">Max 300 rows per upload</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Paste area toggle */}
          <details className="group">
            <summary className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer select-none">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Or paste CSV text directly
            </summary>
            <textarea
              className="mt-2 w-full h-36 text-xs font-mono border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder={`${TEMPLATES[type].headers}\n${TEMPLATES[type].example}`}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setPreview(null);
                setError(null);
              }}
            />
          </details>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={parsing || !csvText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is reading your file…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Parse with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Preview table ── */}
      {preview && !result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">3. Review parsed data</h2>
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Start over
            </button>
          </div>

          {/* Summary badges */}
          <div className="flex gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validCount} ready to import
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                <XCircle className="w-3.5 h-3.5" />
                {errorCount} rows with errors (will be skipped)
              </span>
            )}
          </div>

          {/* Column mapping */}
          {Object.keys(preview.columnMapping).length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="font-medium text-gray-600 mb-1">Column mapping detected:</p>
              {Object.entries(preview.columnMapping).map(([orig, mapped]) => (
                <span key={orig} className="inline-flex items-center gap-1 mr-3">
                  <span className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">{orig}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-violet-600">{mapped}</span>
                </span>
              ))}
            </div>
          )}

          {/* Rows table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium w-10">#</th>
                  {columns.map((col) => (
                    <th key={col} className="text-left px-3 py-2 text-gray-500 font-medium">
                      {col}
                    </th>
                  ))}
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.rows.map((row: ParsedRow) => {
                  const hasError = row._errors.length > 0;
                  return (
                    <tr
                      key={row._row}
                      className={hasError ? "bg-red-50" : "hover:bg-gray-50"}
                    >
                      <td className="px-3 py-2 text-gray-400">{row._row}</td>
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-gray-700 max-w-[160px] truncate">
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
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || validCount === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Import {validCount} row{validCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Import complete</h3>
            <p className="text-sm text-gray-500 mt-1">
              {result.inserted} {TYPE_LABELS[type].toLowerCase()} record{result.inserted !== 1 ? "s" : ""} added successfully
            </p>
          </div>
          <button
            onClick={() => { setResult(null); setType("expenses"); setCsvText(""); }}
            className="px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
