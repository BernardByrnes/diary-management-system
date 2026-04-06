function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <SkeletonBox className="h-8 w-48" />
          <SkeletonBox className="h-4 w-36" />
        </div>
        <SkeletonBox className="hidden sm:block h-9 w-28 rounded-xl" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="w-9 h-9 rounded-xl" />
            </div>
            <SkeletonBox className="h-7 w-32" />
            <SkeletonBox className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Quick Actions skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <SkeletonBox className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Activity + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <SkeletonBox className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SkeletonBox className="h-4 w-28 mb-4" />
          <SkeletonBox className="h-36 w-full" />
        </div>
      </div>
    </div>
  );
}
