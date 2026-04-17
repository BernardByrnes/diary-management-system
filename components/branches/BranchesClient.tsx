"use client";

import { useState, useCallback } from "react";
import { Plus, Search, Pencil, PowerOff, Power, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { branchSchema, type BranchInput } from "@/lib/validations/branch";

interface Manager {
  id: string;
  managerId: string;
  manager: { id: string; fullName: string };
}

interface Branch {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  rentCycle: string | null;
  owner: { id: string; fullName: string; phone: string };
  managers: Manager[];
  createdAt: string;
}

interface OwnerOption {
  id: string;
  fullName: string;
}

interface ManagerOption {
  id: string;
  fullName: string;
}

interface BranchesClientProps {
  initialBranches: Branch[];
  ownerOptions: OwnerOption[];
  managerOptions: ManagerOption[];
}

let toastCounter = 0;

export default function BranchesClient({
  initialBranches,
  ownerOptions,
  managerOptions,
}: BranchesClientProps) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.owner.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(branch: Branch) {
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !branch.isActive }),
    });
    if (res.ok) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branch.id ? { ...b, isActive: !b.isActive } : b
        )
      );
      addToast(
        "success",
        `${branch.name} ${branch.isActive ? "deactivated" : "activated"}`
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
              placeholder="Search branches..."
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
            Add Branch
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Branch
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Location
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Branch Owner
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Managers
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
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search ? "No branches match your search" : "No branches yet"}
                      </p>
                      {!search && (
                        <p className="text-xs text-gray-400 mt-1">
                          Click &ldquo;Add Branch&rdquo; to get started.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((branch) => (
                  <tr
                    key={branch.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900">
                        {branch.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {branch.location}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-gray-700">{branch.owner.fullName}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {branch.managers.length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {branch.managers.map((m) => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md"
                            >
                              {m.manager.fullName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge active={branch.isActive} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(branch)}
                          className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(branch)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            branch.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-700 hover:bg-green-50"
                          }`}
                          title={branch.isActive ? "Deactivate" : "Activate"}
                        >
                          {branch.isActive ? (
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
          {filtered.length} of {branches.length} branches
        </p>
      </div>

      {/* Add Modal */}
      <BranchFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ownerOptions={ownerOptions}
        managerOptions={managerOptions}
        saving={saving}
        setSaving={setSaving}
        onSuccess={(newBranch) => {
          setBranches((prev) => [newBranch, ...prev]);
          setAddOpen(false);
          addToast("success", `Branch "${newBranch.name}" created`);
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <BranchFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          ownerOptions={ownerOptions}
          managerOptions={managerOptions}
          saving={saving}
          setSaving={setSaving}
          editBranch={editTarget}
          onSuccess={(updated) => {
            setBranches((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b))
            );
            setEditTarget(null);
            addToast("success", `Branch "${updated.name}" updated`);
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </>
  );
}

interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  ownerOptions: OwnerOption[];
  managerOptions: ManagerOption[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  editBranch?: Branch;
  onSuccess: (branch: Branch) => void;
  onError: (msg: string) => void;
}

function BranchFormModal({
  open,
  onClose,
  ownerOptions,
  managerOptions,
  saving,
  setSaving,
  editBranch,
  onSuccess,
  onError,
}: BranchFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: editBranch?.name ?? "",
      location: editBranch?.location ?? "",
      ownerId: editBranch?.owner.id ?? "",
      managerIds: editBranch?.managers.map((m) => m.managerId) ?? [],
      rentCycle: (editBranch?.rentCycle as "ANNUAL" | "BI_ANNUAL" | null | undefined) ?? undefined,
    },
  });

  const selectedManagerIds = watch("managerIds") ?? [];

  function toggleManager(id: string) {
    const current = selectedManagerIds;
    if (current.includes(id)) {
      setValue(
        "managerIds",
        current.filter((m) => m !== id)
      );
    } else {
      setValue("managerIds", [...current, id]);
    }
  }

  const onSubmit = async (data: BranchInput) => {
    setSaving(true);
    try {
      const url = editBranch
        ? `/api/branches/${editBranch.id}`
        : "/api/branches";
      const method = editBranch ? "PATCH" : "POST";

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editBranch ? "Edit Branch" : "Add New Branch"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Branch Name
          </label>
          <input
            {...register("name")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. Nyendo, Masaka"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Location
          </label>
          <input
            {...register("location")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. Masaka"
          />
          {errors.location && (
            <p className="mt-1 text-xs text-red-500">
              {errors.location.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Branch Owner
          </label>
          <select
            {...register("ownerId")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="">Select owner...</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName}
              </option>
            ))}
          </select>
          {errors.ownerId && (
            <p className="mt-1 text-xs text-red-500">{errors.ownerId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Rent payment cycle{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            {...register("rentCycle", {
              setValueAs: (v: string) => (v === "" ? null : v),
            })}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="">Use organisation default</option>
            <option value="ANNUAL">Annual</option>
            <option value="BI_ANNUAL">Biannual (every 6 months)</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            For recording rent expenses: how often this branch pays rent (see Settings for the
            default).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Managers{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {managerOptions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No managers available</p>
          ) : (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {managerOptions.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedManagerIds.includes(m.id)}
                    onChange={() => toggleManager(m.id)}
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{m.fullName}</span>
                </label>
              ))}
            </div>
          )}
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
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : editBranch ? "Save Changes" : "Create Branch"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
