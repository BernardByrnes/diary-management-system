"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle, DollarSign, PackageX, ChevronRight } from "lucide-react";
import type { Alert } from "@/lib/utils/command-center";

const iconMap = {
  LOSS: TrendingDown,
  DISCREPANCY: AlertTriangle,
  PAYMENT: DollarSign,
  STOCK: PackageX,
};

const colorMap = {
  HIGH: {
    border: "border-red-500",
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
  },
  MEDIUM: {
    border: "border-yellow-500",
    bg: "bg-yellow-50",
    icon: "bg-yellow-100 text-yellow-600",
  },
  LOW: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
  },
};

export default function CommandCenterAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <>
      <motion.div
        className={`space-y-3 ${alerts.length > 5 ? "max-h-96 overflow-y-auto pr-2" : ""}`}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        initial="hidden"
        animate="show"
      >
        {alerts.map((alert) => {
          const Icon = iconMap[alert.type];
          const colors = colorMap[alert.urgency];
          return (
            <motion.div
              key={alert.id}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            >
              <Link
                href={alert.actionUrl}
                className={`block bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${colors.border} p-4 hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.message}
                    </p>
                    {alert.metadata && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {alert.metadata.branchName && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {alert.metadata.branchName}
                          </span>
                        )}
                        {alert.metadata.amount !== undefined && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            UGX {new Intl.NumberFormat("en-UG").format(alert.metadata.amount)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
      <p className="text-xs text-gray-500 mt-4 text-center">
        Projections are estimates based on historical trends and may not reflect actual future outcomes.
      </p>
    </>
  );
}