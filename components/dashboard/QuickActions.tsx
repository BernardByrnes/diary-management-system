import Link from "next/link";
import { CreditCard, Calculator, PieChart, CheckSquare } from "lucide-react";

const actions = [
  {
    label: "Record Advance",
    href: "/dashboard/advances",
    icon: CreditCard,
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    iconColor: "text-blue-600",
    textColor: "text-blue-900",
  },
  {
    label: "Calculate Payments",
    href: "/dashboard/payments",
    icon: Calculator,
    bg: "bg-amber-50",
    hover: "hover:bg-amber-100",
    iconColor: "text-amber-600",
    textColor: "text-amber-900",
  },
  {
    label: "Calculate Distributions",
    href: "/dashboard/distributions",
    icon: PieChart,
    bg: "bg-purple-50",
    hover: "hover:bg-purple-100",
    iconColor: "text-purple-600",
    textColor: "text-purple-900",
  },
  {
    label: "Pending Approvals",
    href: "/dashboard/transfers",
    icon: CheckSquare,
    bg: "bg-green-50",
    hover: "hover:bg-green-100",
    iconColor: "text-green-600",
    textColor: "text-green-900",
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl ${action.bg} ${action.hover} transition-colors min-h-[88px]`}
            >
              <div className={`w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className={`text-xs font-semibold text-center leading-tight ${action.textColor}`}>
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
