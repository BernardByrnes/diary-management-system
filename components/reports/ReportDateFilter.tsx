"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  from: string;
  to: string;
}

export default function ReportDateFilter({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: "from" | "to", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function handleReset() {
    router.push(pathname);
  }

  const hasFilter = !!(from || to);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-500 text-xs font-medium">Period:</span>
      <input
        type="date"
        defaultValue={from}
        onBlur={(e) => update("from", e.target.value)}
        onChange={(e) => {
          if (e.target.value === "") update("from", "");
        }}
        className="py-1.5 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
        title="From date"
      />
      <span className="text-gray-400">–</span>
      <input
        type="date"
        defaultValue={to}
        onBlur={(e) => update("to", e.target.value)}
        onChange={(e) => {
          if (e.target.value === "") update("to", "");
        }}
        className="py-1.5 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
        title="To date"
      />
      {hasFilter && (
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Reset to current month
        </button>
      )}
    </div>
  );
}
