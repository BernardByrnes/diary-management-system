import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Truck } from "lucide-react";
import SuppliersClient from "@/components/suppliers/SuppliersClient";

export default async function SuppliersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as { id: string; role: string };

  if (!["EXECUTIVE_DIRECTOR", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized = suppliers.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Truck className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-400">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <SuppliersClient
        initialSuppliers={serialized as Parameters<typeof SuppliersClient>[0]["initialSuppliers"]}
      />
    </div>
  );
}
