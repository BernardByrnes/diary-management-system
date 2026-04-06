function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function ChangePasswordLoading() {
  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-1.5">
        <SkeletonBox className="h-7 w-44" />
        <SkeletonBox className="h-4 w-64" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonBox className="h-3 w-28" />
            <SkeletonBox className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <SkeletonBox className="h-11 w-full rounded-xl mt-2" />
      </div>
    </div>
  );
}
