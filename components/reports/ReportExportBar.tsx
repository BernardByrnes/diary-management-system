"use client";

import { useCallback } from "react";
import { FileText } from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/utils/csv";
import PdfButton from "@/components/ui/PdfButton";

interface Column<T> {
  key: keyof T;
  label: string;
}

interface ReportExportBarProps<T extends Record<string, unknown>> {
  reportTitle: string;
  reportPeriod?: string;
  csvFilename: string;
  csvColumns: Column<T>[];
  csvRows: T[];
}

export default function ReportExportBar<T extends Record<string, unknown>>({
  reportTitle,
  reportPeriod,
  csvFilename,
  csvColumns,
  csvRows,
}: ReportExportBarProps<T>) {
  const handleCsvExport = useCallback(() => {
    const csv = generateCSV(csvColumns, csvRows);
    downloadCSV(csvFilename, csv);
  }, [csvColumns, csvRows, csvFilename]);

  const pdfColumns = csvColumns.map((c) => ({ key: String(c.key), label: c.label }));
  const pdfRows = csvRows.map((row) =>
    Object.fromEntries(csvColumns.map((c) => [String(c.key), String(row[c.key] ?? "")]))
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleCsvExport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors shadow-sm"
        title="Download spreadsheet (CSV)"
      >
        <FileText className="w-4 h-4" />
        Export CSV
      </button>
      <PdfButton
        title={reportTitle}
        filename={csvFilename.replace(".csv", ".pdf")}
        columns={pdfColumns}
        rows={pdfRows}
        period={reportPeriod}
        variant="filled"
      />
    </div>
  );
}
