"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SessionIdleTimeout from "./SessionIdleTimeout";
import { FloatingActions } from "@/components/ui/FloatingActions";
import { AiChat } from "@/components/ai/AiChat";
import type { Role } from "@prisma/client";

interface DashboardShellProps {
  children: React.ReactNode;
  fullName: string;
  role: Role;
  userId: string;
}

export default function DashboardShell({
  children,
  fullName,
  role,
  userId,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SessionIdleTimeout />
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          fullName={fullName}
          role={role}
          userId={userId}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {(role === "EXECUTIVE_DIRECTOR" || role === "MANAGER") && (
        <FloatingActions />
      )}
      <AiChat />
    </div>
  );
}
