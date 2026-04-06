"use client";
import PageError from "@/components/ui/PageError";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
