function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-7 w-24" />
          <SkeletonBox className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
