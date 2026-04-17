"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="branch-summary-branch" className="text-gray-500 text-xs font-medium">
          Branch
        </label>
        <select
          id="branch-summary-branch"
          value={branchId}
          onChange={(e) => pushParams({ branchId: e.target.value })}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 min-w-[200px]"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <span className="text-gray-400 hidden sm:inline">|</span>
      <span className="text-gray-500 text-xs font-medium">Period</span>
      <input
        type="date"
        defaultValue={from}
        onBlur={(e) => pushParams({ from: e.target.value })}
        onChange={(e) => {
          if (e.target.value === "") pushParams({ from: undefined });
        }}
        className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
        title="From date"
      />
      <span className="text-gray-400">–</span>
      <input
        type="date"
        defaultValue={to}
        onBlur={(e) => pushParams({ to: e.target.value })}
        onChange={(e) => {
          if (e.target.value === "") pushParams({ to: undefined });
        }}
        className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
        title="To date"
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Reset period
        </button>
      )}
    </div>
  );
}
