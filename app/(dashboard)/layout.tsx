import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import DashboardShell from "@/components/layout/DashboardShell";
import type { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as {
    id: string;
    fullName: string;
    role: Role;
    mustChangePassword: boolean;
  };

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <DashboardShell
      fullName={user.fullName}
      role={user.role}
      userId={user.id}
    >
      {children}
    </DashboardShell>
  );
}
