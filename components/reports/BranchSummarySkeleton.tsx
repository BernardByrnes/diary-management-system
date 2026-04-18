function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

/** Layout mirror of the branch summary stats + panels (filters row is separate). */
export default function BranchSummarySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <SkeletonBox className="h-4 max-w-3xl bg-gray-100" />
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-0 p-1.5 sm:p-2">
            <div className="min-h-28 space-y-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <SkeletonBox className="h-3 w-20 bg-gray-200 rounded" />
              <SkeletonBox className="h-7 w-32 bg-gray-200 rounded" />
              <SkeletonBox className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid w-full grid-cols-1 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="min-w-0 p-2">
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <SkeletonBox className="h-4 w-28 bg-gray-200 rounded" />
              <SkeletonBox className="h-4 w-full bg-gray-100 rounded" />
              <SkeletonBox className="h-4 w-full bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
