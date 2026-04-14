"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Droplets,
  ShoppingCart,
  Receipt,
  Wallet,
  ArrowLeftRight,
  Landmark,
  CalendarCheck,
  PieChart,
  BarChart3,
  FlaskConical,
  Bell,
  Settings,
  ClipboardList,
  ShieldCheck,
  PackageSearch,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: Record<Role, NavSection[]> = {
  EXECUTIVE_DIRECTOR: [
    {
      heading: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      heading: "Operations",
      items: [
        { href: "/dashboard/milk-supply", label: "Milk Deliveries", icon: Droplets },
        { href: "/dashboard/sales", label: "Sales", icon: ShoppingCart },
        { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
        { href: "/dashboard/advances", label: "Advances", icon: Wallet },
        { href: "/dashboard/transfers", label: "Transfers", icon: ArrowLeftRight },
        { href: "/dashboard/spoilage", label: "Spoilage", icon: AlertTriangle },
        { href: "/dashboard/banking", label: "Banking", icon: Landmark },
        { href: "/dashboard/stock-snapshots", label: "Stock Counts", icon: PackageSearch },
      ],
    },
    {
      heading: "Management",
      items: [
        { href: "/dashboard/branches", label: "Branches", icon: Building2 },
        { href: "/dashboard/users", label: "Users", icon: Users },
        { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
        { href: "/dashboard/payments", label: "Payments", icon: CalendarCheck },
        { href: "/dashboard/distributions", label: "Distributions", icon: PieChart },
        { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      heading: "System",
      items: [
        { href: "/dashboard/audit-log", label: "Audit Log", icon: ClipboardList },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
        { href: "/dashboard/change-password", label: "Change Password", icon: ShieldCheck },
      ],
    },
  ],
  MANAGER: [
    {
      heading: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      heading: "Operations",
      items: [
        { href: "/dashboard/milk-supply", label: "Milk Deliveries", icon: Droplets },
        { href: "/dashboard/sales", label: "Sales", icon: ShoppingCart },
        { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
        { href: "/dashboard/banking", label: "Banking", icon: Landmark },
        { href: "/dashboard/lactometer", label: "Lactometer", icon: FlaskConical },
        { href: "/dashboard/transfers", label: "Transfers", icon: ArrowLeftRight },
        { href: "/dashboard/spoilage", label: "Spoilage", icon: AlertTriangle },
        { href: "/dashboard/stock-snapshots", label: "Stock Counts", icon: PackageSearch },
      ],
    },
    {
      heading: "Account",
      items: [
        { href: "/dashboard/change-password", label: "Change Password", icon: ShieldCheck },
      ],
    },
  ],
  OWNER: [
    {
      heading: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      heading: "My Data",
      items: [
        { href: "/dashboard/my-branches", label: "My Branches", icon: Building2 },
        { href: "/dashboard/my-advances", label: "My Advances", icon: Wallet },
        { href: "/dashboard/my-distributions", label: "My Distributions", icon: PieChart },
        { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
        { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      heading: "Account",
      items: [
        { href: "/dashboard/change-password", label: "Change Password", icon: ShieldCheck },
      ],
    },
  ],
};

interface SidebarProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sections = navSections[role] ?? [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-60 bg-green-950 text-white flex flex-col transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 p-1">
            <Image
              src="/bwera logo.png"
              alt="Bwera Dairy"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">Bwera Dairy</p>
            <p className="text-[10px] text-green-400 tracking-wide uppercase">Cooperative</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {sections.map((section) => (
            <div key={section.heading} className="mb-5">
              <p className="text-[10px] font-semibold text-green-500 uppercase tracking-widest px-3 mb-1.5">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <motion.div
                        whileHover={isActive ? {} : { x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                            ${
                              isActive
                                ? "bg-green-600/80 text-white shadow-sm"
                                : "text-green-200 hover:bg-white/8 hover:text-white"
                            }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-white" : "text-green-400"
                            }`}
                          />
                          {item.label}
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer version */}
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-[10px] text-green-600">v0.6.0 — Phase 6</p>
        </div>
      </aside>
    </>
  );
}
