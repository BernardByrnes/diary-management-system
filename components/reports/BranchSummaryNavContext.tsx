"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import BranchSummarySkeleton from "@/components/reports/BranchSummarySkeleton";

type BranchSummaryNavContextValue = {
  navigate: (href: string) => void;
  isPending: boolean;
};

const BranchSummaryNavContext = createContext<BranchSummaryNavContextValue | null>(null);

export function useBranchSummaryNav(): BranchSummaryNavContextValue {
  const ctx = useContext(BranchSummaryNavContext);
  if (!ctx) {
    throw new Error("useBranchSummaryNav must be used within BranchSummaryNavProvider");
  }
  return ctx;
}

export function BranchSummaryNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  const value = useMemo(() => ({ navigate, isPending }), [navigate, isPending]);

  return (
    <BranchSummaryNavContext.Provider value={value}>
      <div className="relative min-h-[320px]">
        {children}
        {isPending && (
          <div
            className="absolute inset-0 z-10 flex flex-col gap-4 rounded-2xl bg-white/85 backdrop-blur-[2px] px-1 pt-1"
            role="status"
          >
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-emerald-800">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
              <span>Loading report…</span>
            </div>
            <BranchSummarySkeleton />
          </div>
        )}
      </div>
    </BranchSummaryNavContext.Provider>
  );
}
