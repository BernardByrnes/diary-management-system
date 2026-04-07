import Image from "next/image";
import { TrendingUp, TrendingDown, Droplets } from "lucide-react";

interface HighlightCardProps {
  litersToday: number;
  litersYesterday: number;
  branchCount: number;
}

export default function HighlightCard({
  litersToday,
  litersYesterday,
  branchCount,
}: HighlightCardProps) {
  const diff = litersYesterday > 0
    ? ((litersToday - litersYesterday) / litersYesterday) * 100
    : 0;
  const isUp = diff >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-6 text-white shadow-sm">
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -right-4 w-52 h-52 rounded-full bg-white/5" />
      <div className="absolute top-1/2 -left-8 w-28 h-28 rounded-full bg-white/5" />

      {/* Milk truck image */}
      <div className="absolute -top-4 right-0 w-[55%] h-[55%] pointer-events-none">
        <Image
          src="/Milk-Truck.png"
          alt="Milk Truck"
          fill
          className="object-contain object-right-top drop-shadow-lg"
        />
      </div>

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-green-200" />
          </div>
          <span className="text-green-200 text-xs font-medium uppercase tracking-widest">
            Today&apos;s Delivery
          </span>
        </div>

        {/* Main value */}
        <div className="mb-5">
          <p className="text-5xl font-bold font-mono tracking-tight leading-none">
            {litersToday.toFixed(1)}
            <span className="text-2xl font-normal text-green-300 ml-1.5">L</span>
          </p>
          <p className="text-green-200 text-sm mt-2">Total milk received today</p>
        </div>

        {/* Trend + branches row */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              isUp
                ? "bg-green-400/20 text-green-200"
                : "bg-red-400/20 text-red-200"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {Math.abs(diff).toFixed(1)}% vs yesterday
          </span>

          <div className="text-right">
            <p className="text-2xl font-bold font-mono">{branchCount}</p>
            <p className="text-green-300 text-xs">Active Branches</p>
          </div>
        </div>
      </div>
    </div>
  );
}
