"use client";

import { useState } from "react";
import { generateFinancialStory, type FinancialStoryData } from "@/lib/utils/financial-story";
import { FileText, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  storyData: FinancialStoryData;
};

export function FinancialStorySummary({ storyData }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      // generateFinancialStory is a pure function — no async needed
      // Wrapped in async/try-catch to support future server-side generation
      const generated = generateFinancialStory(storyData);
      setSummary(generated);
      toast.success("Summary generated successfully");
    } catch (error) {
      console.error("Summary generation failed:", error);
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="mb-2">
      {/* Generate Summary Button */}
      <button
        onClick={handleGenerateSummary}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors text-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Generate Summary
          </>
        )}
      </button>

      {/* Summary Display Card */}
      {summary && (
        <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Financial Summary
            </h3>
            <button
              onClick={handleCopyToClipboard}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* Summary text */}
          <div className="space-y-4">
            {summary.split("\n\n").map((paragraph, index) => (
              <p
                key={index}
                className="text-sm leading-relaxed text-gray-800"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
