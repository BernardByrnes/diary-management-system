import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trend?: { value: string; positive: boolean };
  alert?: boolean;
}

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  alert = false,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all duration-200 ${
        alert ? "border-red-200 bg-red-50/30" : "border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend.positive
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight leading-none">
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1.5">{label}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}
