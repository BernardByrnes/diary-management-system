function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-7 w-24" />
          <SkeletonBox className="h-4 w-40" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <SkeletonBox className="h-5 w-36" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="space-y-1.5">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
