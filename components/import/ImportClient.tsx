"use client";

import { useState, useRef } from "react";
import type { ImportType, ImportPreview, AutoImportPreview, ParsedRow } from "@/app/api/import/route";
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  Sparkles,
} from "lucide-react";

// ── CSV templates ─────────────────────────────────────────────────────────────

const TEMPLATES: Record<Exclude<ImportType, "auto">, { filename: string; headers: string; example: string }> = {
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

function downloadTemplate(type: Exclude<ImportType, "auto">) {
  const t = TEMPLATES[type];
  const blob = new Blob([`${t.headers}\n${t.example}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ImportType, string> = {
  expenses: "Expenses",
  milk: "Milk Deliveries",
  sales: "Sales",
  auto: "Auto-detect (mixed file)",
};

const COLUMN_DEFS: Record<Exclude<ImportType, "auto">, string[]> = {
  expenses: ["branch_name", "date", "category", "description", "amount", "payment_method"],
  milk: ["branch_name", "supplier_name", "date", "liters", "cost_per_liter"],
  sales: ["branch_name", "date", "liters_sold", "price_per_liter"],
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ColumnMapping({ mapping }: { mapping: Record<string, string> }) {
  if (!Object.keys(mapping).length) return null;
  return (
    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
      <p className="font-medium text-gray-600 mb-1">Column mapping:</p>
      {Object.entries(mapping).map(([orig, mapped]) => (
        <span key={orig} className="inline-flex items-center gap-1 mr-3">
          <span className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">{orig}</span>
          <span className="text-gray-400">→</span>
          <span className="font-mono text-violet-600">{mapped}</span>
        </span>
      ))}
    </div>
  );
}

function RowsTable({ rows, type }: { rows: ParsedRow[]; type: Exclude<ImportType, "auto"> }) {
  const columns = COLUMN_DEFS[type];
  if (!rows.length) return <p className="text-xs text-gray-400 italic">No rows of this type found.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 font-medium w-10">#</th>
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

function GroupSection({
  label,
  group,
  type,
}: {
  label: string;
  group: { rows: ParsedRow[]; columnMapping: Record<string, string> };
  type: Exclude<ImportType, "auto">;
}) {
  const valid = group.rows.filter((r) => r._errors.length === 0).length;
  const errors = group.rows.filter((r) => r._errors.length > 0).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {valid > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />{valid} ready
          </span>
        )}
        {errors > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-medium">
            <XCircle className="w-3 h-3" />{errors} errors
          </span>
        )}
      </div>
      <ColumnMapping mapping={group.columnMapping} />
      <RowsTable rows={group.rows} type={type} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [type, setType] = useState<ImportType>("expenses");
  const [csvText, setCsvText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | AutoImportPreview | null>(null);
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

  function handleTypeChange(t: ImportType) {
    setType(t);
    reset();
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
        body: JSON.stringify({ type, csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Parse failed.");
      else setPreview(data as ImportPreview | AutoImportPreview);
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
      let body: object;
      if (preview.type === "auto") {
        const p = preview as AutoImportPreview;
        body = {
          type: "auto",
          confirm: true,
          groups: {
            expenses: p.groups.expenses?.rows.filter((r) => r._errors.length === 0),
            milk: p.groups.milk?.rows.filter((r) => r._errors.length === 0),
            sales: p.groups.sales?.rows.filter((r) => r._errors.length === 0),
          },
        };
      } else {
        const p = preview as ImportPreview;
        body = { type: p.type, confirm: true, rows: p.rows };
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // Compute valid count for confirm button
  let validCount = 0;
  if (preview) {
    if (preview.type === "auto") {
      const p = preview as AutoImportPreview;
      validCount =
        (p.groups.expenses?.rows.filter((r) => r._errors.length === 0).length ?? 0) +
        (p.groups.milk?.rows.filter((r) => r._errors.length === 0).length ?? 0) +
        (p.groups.sales?.rows.filter((r) => r._errors.length === 0).length ?? 0);
    } else {
      validCount = (preview as ImportPreview).rows.filter((r) => r._errors.length === 0).length;
    }
  }

  const isAuto = type === "auto";

  return (
    <div className="space-y-6">
      {/* ── Type selector ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">1. Choose import type</h2>
        <div className="flex gap-3 flex-wrap">
          {(["expenses", "milk", "sales", "auto"] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                type === t
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
              }`}
            >
              {t === "auto" && <Sparkles className="w-3.5 h-3.5" />}
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {isAuto ? (
          <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span className="text-sm text-violet-700">
              Upload any spreadsheet — the AI will classify each row as an expense, milk delivery, or sale automatically.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 text-violet-600 shrink-0" />
            <span className="text-sm text-violet-700">Download the template to see the expected column format</span>
            <button
              onClick={() => downloadTemplate(type as Exclude<ImportType, "auto">)}
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              <Download className="w-4 h-4" />Template
            </button>
          </div>
        )}
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
                ? `File loaded (${csvText.split("\n").filter(Boolean).length - 1} data rows)`
                : "Click to select a CSV file"}
            </span>
            <span className="text-xs text-gray-400">Max 300 rows per upload</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </label>

          <details className="group">
            <summary className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer select-none">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Or paste CSV text directly
            </summary>
            <textarea
              className="mt-2 w-full h-36 text-xs font-mono border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder={isAuto ? "Paste your mixed CSV here..." : `${TEMPLATES[type as Exclude<ImportType, "auto">].headers}\n${TEMPLATES[type as Exclude<ImportType, "auto">].example}`}
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setPreview(null); setError(null); }}
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
            {parsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />AI is reading your file…</>
            ) : (
              <><Upload className="w-4 h-4" />Parse with AI</>
            )}
          </button>
        </div>
      )}

      {/* ── Preview: single-type ── */}
      {preview && preview.type !== "auto" && !result && (
        <SingleTypePreview
          preview={preview as ImportPreview}
          validCount={validCount}
          confirming={confirming}
          error={error}
          onReset={reset}
          onConfirm={handleConfirm}
        />
      )}

      {/* ── Preview: auto ── */}
      {preview && preview.type === "auto" && !result && (
        <AutoPreview
          preview={preview as AutoImportPreview}
          validCount={validCount}
          confirming={confirming}
          error={error}
          onReset={reset}
          onConfirm={handleConfirm}
        />
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
              {result.inserted} record{result.inserted !== 1 ? "s" : ""} added successfully
            </p>
            {result.breakdown && (
              <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
                {Object.entries(result.breakdown).filter(([, v]) => v > 0).map(([k, v]) => (
                  <span key={k}>{TYPE_LABELS[k as ImportType]}: <strong>{v}</strong></span>
                ))}
              </div>
            )}
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

// ── Single-type preview ───────────────────────────────────────────────────────

function SingleTypePreview({
  preview,
  validCount,
  confirming,
  error,
  onReset,
  onConfirm,
}: {
  preview: ImportPreview;
  validCount: number;
  confirming: boolean;
  error: string | null;
  onReset: () => void;
  onConfirm: () => void;
}) {
  const errorCount = preview.errorRows;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">3. Review parsed data</h2>
        <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-600">Start over</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />{validCount} ready
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
            <XCircle className="w-3.5 h-3.5" />{errorCount} rows with errors (skipped)
          </span>
        )}
      </div>

      <ColumnMapping mapping={preview.columnMapping} />
      <RowsTable rows={preview.rows} type={preview.type} />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onReset} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming || validCount === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {confirming ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><CheckCircle2 className="w-4 h-4" />Import {validCount} row{validCount !== 1 ? "s" : ""}</>}
        </button>
      </div>
    </div>
  );
}

// ── Auto preview (three groups) ───────────────────────────────────────────────

function AutoPreview({
  preview,
  validCount,
  confirming,
  error,
  onReset,
  onConfirm,
}: {
  preview: AutoImportPreview;
  validCount: number;
  confirming: boolean;
  error: string | null;
  onReset: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">3. Review parsed data</h2>
        <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-600">Start over</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />{validCount} total ready
        </span>
        {preview.errorRows > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
            <XCircle className="w-3.5 h-3.5" />{preview.errorRows} errors (skipped)
          </span>
        )}
      </div>

      <div className="space-y-6 divide-y divide-gray-100">
        {preview.groups.expenses && (
          <div className="pt-4 first:pt-0">
            <GroupSection label="Expenses" group={preview.groups.expenses} type="expenses" />
          </div>
        )}
        {preview.groups.milk && (
          <div className="pt-4 first:pt-0">
            <GroupSection label="Milk Deliveries" group={preview.groups.milk} type="milk" />
          </div>
        )}
        {preview.groups.sales && (
          <div className="pt-4 first:pt-0">
            <GroupSection label="Sales" group={preview.groups.sales} type="sales" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onReset} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
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
