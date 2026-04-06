"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface PageErrorProps {
  message?: string;
  reset: () => void;
}

export default function PageError({
  message = "Something went wrong while loading this page.",
  reset,
}: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Unable to load this page
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
        {message}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
