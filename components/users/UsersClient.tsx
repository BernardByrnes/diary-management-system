"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  KeyRound,
  Copy,
  Check,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/user";

type RoleFilter = "ALL" | "EXECUTIVE_DIRECTOR" | "MANAGER" | "OWNER";

const ROLE_LABELS: Record<string, string> = {
  EXECUTIVE_DIRECTOR: "Executive Director",
  MANAGER: "Manager",
  OWNER: "Branch Owner",
};

const ROLE_COLORS: Record<string, string> = {
  EXECUTIVE_DIRECTOR: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  OWNER: "bg-amber-100 text-amber-700",
};

interface User {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface UsersClientProps {
  initialUsers: User[];
}

let toastCounter = 0;

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    name: string;
    password: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function toggleActive(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
      addToast(
        "success",
        `${user.fullName} ${user.isActive ? "deactivated" : "activated"}`
      );
    } else {
      const data = await res.json();
      addToast("error", data.error ?? "Something went wrong");
    }
  }

  async function resetPassword(user: User) {
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setTempPasswordModal({ name: user.fullName, password: data.tempPassword });
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            />
          </div>
          <div className="flex gap-1.5">
            {(["ALL", "EXECUTIVE_DIRECTOR", "MANAGER", "OWNER"] as RoleFilter[]).map(
              (r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    roleFilter === r
                      ? "bg-green-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {r === "ALL" ? "All" : ROLE_LABELS[r]}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
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
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Role
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
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search || roleFilter !== "ALL" ? "No users match your filters" : "No users yet"}
                      </p>
                      {!search && roleFilter === "ALL" && (
                        <p className="text-xs text-gray-400 mt-1">
                          Click &ldquo;Add User&rdquo; to create the first user.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.fullName}
                        </p>
                        {user.mustChangePassword && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            Must change password
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs hidden sm:table-cell">
                      {user.phone}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge active={user.isActive} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(user)}
                          className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => resetPassword(user)}
                          disabled={saving}
                          className="p-2.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-700 hover:bg-green-50"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? (
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
          {filtered.length} of {users.length} users
        </p>
      </div>

      {/* Add Modal */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(user, tempPassword) => {
          setUsers((prev) => [user, ...prev]);
          setAddOpen(false);
          setTempPasswordModal({ name: user.fullName, password: tempPassword });
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <EditUserModal
          open={!!editTarget}
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
            );
            setEditTarget(null);
            addToast("success", `${updated.fullName} updated`);
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}

      {/* Temp Password Modal */}
      {tempPasswordModal && (
        <TempPasswordModal
          name={tempPasswordModal.name}
          password={tempPasswordModal.password}
          onClose={() => setTempPasswordModal(null)}
        />
      )}
    </>
  );
}

function AddUserModal({
  open,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User, tempPassword: string) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });

  const onSubmit = async (data: CreateUserInput) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      onSuccess(json.user, json.tempPassword);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add New User"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Full Name
          </label>
          <input
            {...register("fullName")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            placeholder="e.g. Amina Mugenyi"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
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
            Role
          </label>
          <select
            {...register("role")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="">Select role...</option>
            <option value="EXECUTIVE_DIRECTOR">Executive Director</option>
            <option value="MANAGER">Manager</option>
            <option value="OWNER">Branch Owner</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>
          )}
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
          A temporary password will be generated. The user must change it on
          first login.
        </p>

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
            {isSubmitting ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  open,
  user,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (user: Partial<User> & { id: string }) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as "EXECUTIVE_DIRECTOR" | "MANAGER" | "OWNER",
    },
  });

  const onSubmit = async (data: UpdateUserInput) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      onError(json.error ?? "Something went wrong");
    } else {
      reset();
      onSuccess({ id: user.id, ...data });
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={`Edit — ${user.fullName}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Full Name
          </label>
          <input
            {...register("fullName")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Phone Number
          </label>
          <input
            {...register("phone")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Role
          </label>
          <select
            {...register("role")}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
          >
            <option value="EXECUTIVE_DIRECTOR">Executive Director</option>
            <option value="MANAGER">Manager</option>
            <option value="OWNER">Branch Owner</option>
          </select>
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TempPasswordModal({
  name,
  password,
  onClose,
}: {
  name: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open onClose={onClose} title="Temporary Password">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Share this temporary password with{" "}
          <strong className="text-gray-900">{name}</strong>. They must change it
          on first login.
        </p>
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <code className="flex-1 font-mono text-base tracking-wider text-gray-900">
            {password}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-2.5 text-gray-400 hover:text-green-700 transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
          This password will not be shown again. Make sure to copy it now.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
