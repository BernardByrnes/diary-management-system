import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Users } from "lucide-react";
import UsersClient from "@/components/users/UsersClient";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400">
            {users.length} user{users.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <UsersClient initialUsers={serialized} />
    </div>
  );
}
