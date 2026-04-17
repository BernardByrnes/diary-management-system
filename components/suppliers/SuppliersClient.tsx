"use client";

import { useState, useCallback } from "react";
import { Plus, Search, Pencil, PowerOff, Power, Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SuppliersClientProps {
  initialSuppliers: Supplier[];
}

let toastCounter = 0;

export default function SuppliersClient({
  initialSuppliers,
}: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(supplier: Supplier) {
    const res = await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !supplier.isActive }),
    });
    if (res.ok) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplier.id ? { ...s, isActive: !s.isActive } : s
        )
      );
      addToast(
        "success",
        `${supplier.name} ${supplier.isActive ? "deactivated" : "activated"}`
      );
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Something went wrong");
    }
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            />
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Phone
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Location
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <Truck className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search ? "No suppliers match your search" : "No suppliers yet"}
                      </p>
                      {!search && (
                        <p className="text-xs text-gray-400 mt-1">
                          Click &ldquo;Add Supplier&rdquo; to register milk suppliers.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900">
                        {supplier.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs hidden sm:table-cell">
                      {supplier.phone}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {supplier.location ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge active={supplier.isActive} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(supplier)}
                          className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(supplier)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            supplier.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-700 hover:bg-green-50"
                          }`}
                          title={supplier.isActive ? "Deactivate" : "Activate"}
                        >
                          {supplier.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 px-1">
          {filtered.length} of {suppliers.length} suppliers
        </p>
      </div>

      {/* Add Modal */}
      <SupplierFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(s) => {
          setSuppliers((prev) => [s, ...prev]);
          setAddOpen(false);
          addToast("success", `Supplier "${s.name}" added`);
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <SupplierFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          editSupplier={editTarget}
          onSuccess={(updated) => {
            setSuppliers((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            setEditTarget(null);
            addToast("success", `"${updated.name}" updated`);
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </>
  );
}

function SupplierFormModal({
  open,
  onClose,
  editSupplier,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editSupplier?: Supplier;
  onSuccess: (supplier: Supplier) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: editSupplier?.name ?? "",
      phone: editSupplier?.phone ?? "",
      location: editSupplier?.location ?? "",
    },
  });

  const onSubmit = async (data: SupplierInput) => {
    const url = editSupplier
      ? `/api/suppliers/${editSupplier.id}`
      : "/api/suppliers";
    const method = editSupplier ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      onSuccess(json);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editSupplier ? "Edit Supplier" : "Add New Supplier"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Supplier Name
          </label>
          <input
            {...register("name")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. John Mwesige"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Phone Number
          </label>
          <input
            {...register("phone")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. 0772123456"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Location{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register("location")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. Masaka"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : editSupplier
              ? "Save Changes"
              : "Add Supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
