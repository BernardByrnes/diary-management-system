"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { BranchSummaryReportData } from "@/lib/utils/pdf-document";

interface Props {
  data: BranchSummaryReportData;
}

export default function BranchSummaryDownloadButton({ data }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { BranchSummaryPDF } = await import("@/lib/utils/pdf-document");
      const blob = await pdf(<BranchSummaryPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = data.branch.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      a.download = `Branch-Summary-${safe}-${data.periodLabel.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
      title="Download PDF report"
    >
      <FileDown className="w-4 h-4" />
      {loading ? "Generating…" : "Download PDF"}
    </button>
  );
}
