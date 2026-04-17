"use client";

import { useState } from "react";
import { Share2, Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";

interface ShareReportButtonProps {
  branchId: string;
  branchName: string;
  periodLabel: string;
  from?: string;
  to?: string;
  ownerName: string;
  managerNames: string[];
}

export default function ShareReportButton({
  branchId,
  branchName,
  periodLabel,
  from,
  to,
  ownerName,
  managerNames,
}: ShareReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          periodFrom: from,
          periodTo: to,
          periodLabel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to share report.");
        return;
      }

      const data = await res.json();
      toast.success(
        `Report shared with ${data.sharedWith.owner}${
          data.sharedWith.managers.length > 0
            ? ` and ${data.sharedWith.managers.length} manager${data.sharedWith.managers.length > 1 ? "s" : ""}`
            : ""
        }.`
      );
      setShared(true);
      setOpen(false);
    } catch {
      toast.error("Failed to share report. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShared(false);
          setOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
        title="Share report with branch owner and managers"
      >
        <Share2 className="w-4 h-4" />
        Share Report
      </button>

      <Modal
        open={open}
        onClose={() => !sharing && setOpen(false)}
        title="Share Branch Report"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send a notification to the branch owner and managers with a link to
            this report. They will be able to view and download the PDF.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Share2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{branchName}</p>
                <p className="text-gray-500">{periodLabel}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              Recipients ({1 + managerNames.length})
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">{ownerName}</span>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  Owner
                </span>
              </div>
              {managerNames.map((name) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-gray-700">{name}</span>
                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    Manager
                  </span>
                </div>
              ))}
            </div>
          </div>

          {shared && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Report notification sent successfully!
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={sharing}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing || shared}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
            >
              {sharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sharing...
                </>
              ) : shared ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Shared
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}