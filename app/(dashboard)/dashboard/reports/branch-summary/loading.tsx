import BranchSummarySkeleton from "@/components/reports/BranchSummarySkeleton";

export default function BranchSummaryLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-gray-100" />
      </div>
      <BranchSummarySkeleton />
    </div>
  );
}
