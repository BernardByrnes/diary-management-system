"use client";

export function CommandCenterError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mb-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <p className="text-red-800 dark:text-red-200 mb-3">
        Unable to load Command Center alerts
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
