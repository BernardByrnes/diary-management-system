"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import type { Role } from "@prisma/client";

const roleLabels: Record<Role, string> = {
  EXECUTIVE_DIRECTOR: "Executive Director",
  MANAGER: "Branch Manager",
  OWNER: "Branch Owner",
};

const roleBadgeColors: Record<Role, string> = {
  EXECUTIVE_DIRECTOR: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  OWNER: "bg-amber-100 text-amber-800",
};

interface TopbarProps {
  fullName: string;
  role: Role;
  userId: string;
  onMenuToggle: () => void;
  organizationName?: string;
}

export default function Topbar({ fullName, role, userId, onMenuToggle, organizationName }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold text-gray-800 hidden sm:block">
          {organizationName ?? "Bwera Farmers Cooperative"}
        </span>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <NotificationBell userId={userId} />

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{fullName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[role]}`}>
              {roleLabels[role]}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-sm">
            {fullName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
          title="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
