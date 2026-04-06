interface PageSkeletonProps {
  /** Number of stat cards to show at the top (0 = no card row) */
  cards?: number;
  /** Number of table rows to show */
  rows?: number;
  /** Show a form column beside the table */
  hasForm?: boolean;
}

function SkeletonBox({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
  );
}

export default function PageSkeleton({
  cards = 3,
  rows = 6,
  hasForm = false,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-7 w-40" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>

      {/* Stat cards */}
      {cards > 0 && (
        <div
          className={`grid gap-4 ${
            cards === 1
              ? "grid-cols-1"
              : cards === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : cards === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-24" />
                <SkeletonBox className="w-9 h-9 rounded-xl" />
              </div>
              <SkeletonBox className="h-7 w-32" />
              <SkeletonBox className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className={`flex gap-4 ${hasForm ? "flex-col lg:flex-row" : ""}`}>
        {/* Table skeleton */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${hasForm ? "flex-1" : "w-full"}`}>
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <SkeletonBox className="h-9 w-48 rounded-xl" />
            <SkeletonBox className="h-9 w-28 rounded-xl" />
          </div>

          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 bg-gray-50/50 border-b border-gray-100">
            {[40, 24, 24, 12].map((w, i) => (
              <SkeletonBox key={i} className={`h-3 w-${w} flex-1`} />
            ))}
          </div>

          {/* Table rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0"
            >
              <SkeletonBox className="h-4 flex-2" />
              <SkeletonBox className="h-4 flex-1 hidden sm:block" />
              <SkeletonBox className="h-4 flex-1 hidden md:block" />
              <div className="flex gap-1.5 shrink-0">
                <SkeletonBox className="w-7 h-7 rounded-lg" />
                <SkeletonBox className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Optional form sidebar */}
        {hasForm && (
          <div className="w-full lg:w-80 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 h-fit">
            <SkeletonBox className="h-5 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-10 w-full rounded-xl" />
              </div>
            ))}
            <SkeletonBox className="h-10 w-full rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
