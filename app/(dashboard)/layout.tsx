import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
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

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
    select: { organizationName: true },
  });

  return (
    <DashboardShell
      fullName={user.fullName}
      role={user.role}
      userId={user.id}
      organizationName={settings?.organizationName}
    >
      {children}
    </DashboardShell>
  );
}
