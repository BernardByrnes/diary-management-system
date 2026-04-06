"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { PdfColumn, PdfRow } from "@/lib/utils/pdf-table";

interface PdfButtonProps {
  title: string;
  filename: string;
  columns: PdfColumn[];
  rows: PdfRow[];
  period?: string;
  variant?: "outline" | "filled";
}

export default function PdfButton({
  title,
  filename,
  columns,
  rows,
  period,
  variant = "outline",
}: PdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { TablePDF } = await import("@/lib/utils/pdf-table");
      const blob = await pdf(
        <TablePDF title={title} period={period} columns={columns} rows={rows} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const filledClass =
    "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-60 rounded-xl transition-colors shadow-sm";
  const outlineClass =
    "flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 disabled:opacity-60 rounded-xl transition-colors";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={variant === "filled" ? filledClass : outlineClass}
      title="Download PDF"
    >
      <FileDown className="w-4 h-4" />
      <span className="hidden sm:inline">{loading ? "Generating…" : "Export PDF"}</span>
    </button>
  );
}
