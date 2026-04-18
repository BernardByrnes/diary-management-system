"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useBranchSummaryNav } from "@/components/reports/BranchSummaryNavContext";

interface Props {
  branches: { id: string; name: string }[];
  branchId: string;
  from: string;
  to: string;
}

export default function BranchSummaryFilters({
  branches,
  branchId,
  from,
  to,
}: Props) {
  const { navigate, isPending } = useBranchSummaryNav();
  const pathname = usePathname();

  const [localBranchId, setLocalBranchId] = useState(branchId);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const matchesLoaded =
    localBranchId === branchId && localFrom === from && localTo === to;

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    params.set("branchId", localBranchId);
    if (localFrom) params.set("from", localFrom);
    if (localTo) params.set("to", localTo);
    navigate(`${pathname}?${params.toString()}`);
  }, [localBranchId, localFrom, localTo, navigate, pathname]);

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="branch-summary-branch" className="text-gray-500 text-xs font-medium">
          Branch
        </label>
        <select
          id="branch-summary-branch"
          value={localBranchId}
          disabled={isPending}
          onChange={(e) => setLocalBranchId(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 min-w-[200px] disabled:opacity-60 disabled:cursor-wait"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <span className="text-gray-400 hidden sm:inline pb-2">|</span>
      <span className="text-gray-500 text-xs font-medium pb-2">Period</span>
      <input
        type="date"
        value={localFrom}
        disabled={isPending}
        onChange={(e) => setLocalFrom(e.target.value)}
        className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:opacity-60 disabled:cursor-wait"
        title="From date"
      />
      <span className="text-gray-400 pb-2">–</span>
      <input
        type="date"
        value={localTo}
        disabled={isPending}
        onChange={(e) => setLocalTo(e.target.value)}
        className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:opacity-60 disabled:cursor-wait"
        title="To date"
      />
      {(localFrom || localTo) && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setLocalFrom("");
            setLocalTo("");
          }}
          className="text-xs text-gray-400 hover:text-gray-600 underline pb-2 disabled:opacity-50 disabled:cursor-wait"
        >
          Reset period
        </button>
      )}
      <button
        type="button"
        onClick={apply}
        disabled={matchesLoaded || isPending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Load report
      </button>
    </div>
  );
}
