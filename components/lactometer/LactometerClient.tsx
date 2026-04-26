"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils/date";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/ui/Modal";
import Toast, { type ToastMessage } from "@/components/ui/Toast";

interface ReadingRecord {
  id: string;
  date: string;
  time: string;
  readingValue: string;
  notes: string | null;
  branch: { id: string; name: string };
  recordedBy: { id: string; fullName: string };
  createdAt: string;
}

interface Props {
  initialRecords: ReadingRecord[];
  branchOptions: { id: string; name: string }[];
  userRole: string;
  rangeMin?: number;
  rangeMax?: number;
}

const readingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  branchId: z.string().min(1, "Branch is required"),
  readingValue: z.number().positive("Reading value must be positive"),
  notes: z.string().optional(),
});

type ReadingInput = z.infer<typeof readingSchema>;

const inputClass =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400";

let toastCounter = 0;

function getReadingColor(value: number, min: number, max: number): string {
  if (value < min) return "text-red-600 font-semibold";
  if (value > max) return "text-orange-600 font-semibold";
  return "text-green-600 font-semibold";
}

export default function LactometerClient({
  initialRecords,
  branchOptions,
  userRole,
  rangeMin = 1.026,
  rangeMax = 1.032,
}: Props) {
  const [records, setRecords] = useState<ReadingRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReadingRecord | null>(null);

  const isED = userRole === "EXECUTIVE_DIRECTOR";

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filtered = records.filter(
    (r) =>
      r.branch.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.notes ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.recordedBy.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(record: ReadingRecord) {
    if (!confirm("Are you sure you want to delete this reading?")) return;
    const res = await fetch(`/api/lactometer/${record.id}`, { method: "DELETE" });
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      addToast("success", "Reading deleted");
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
              placeholder="Search readings..."
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
            Add Reading
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Normal ({rangeMin.toFixed(3)}–{rangeMax.toFixed(3)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Low (&lt;{rangeMin.toFixed(3)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            High (&gt;{rangeMax.toFixed(3)})
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Time
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Branch
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Reading
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Notes
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400 text-sm"
                  >
                    {search ? "No readings match your search" : "No readings yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const val = Number(record.readingValue);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-700">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs hidden sm:table-cell">
                        {record.time}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {record.branch.name}
                      </td>
                      <td className={`px-5 py-3.5 font-mono text-xs ${getReadingColor(val, rangeMin, rangeMax)}`}>
                        {val.toFixed(3)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">
                        {record.notes ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(record)}
                            className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isED && (
                            <button
                              onClick={() => handleDelete(record)}
                              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 px-1">
          {filtered.length} of {records.length} readings
        </p>
      </div>

      {/* Add Modal */}
      <ReadingFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branchOptions={branchOptions}
        onSuccess={(r) => {
          setRecords((prev) => [r, ...prev]);
          setAddOpen(false);
          addToast("success", "Reading recorded");
        }}
        onError={(msg) => addToast("error", msg)}
      />

      {/* Edit Modal */}
      {editTarget && (
        <ReadingFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          editRecord={editTarget}
          branchOptions={branchOptions}
          onSuccess={(updated) => {
            setRecords((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setEditTarget(null);
            addToast("success", "Reading updated");
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </>
  );
}

function ReadingFormModal({
  open,
  onClose,
  editRecord,
  branchOptions,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: ReadingRecord;
  branchOptions: { id: string; name: string }[];
  onSuccess: (record: ReadingRecord) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReadingInput>({
    resolver: zodResolver(readingSchema),
    defaultValues: {
      date: editRecord
        ? new Date(editRecord.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      time: editRecord?.time ?? "",
      branchId: editRecord?.branch.id ?? "",
      readingValue: editRecord ? Number(editRecord.readingValue) : undefined,
      notes: editRecord?.notes ?? "",
    },
  });

  const onSubmit = async (data: ReadingInput) => {
    const url = editRecord ? `/api/lactometer/${editRecord.id}` : "/api/lactometer";
    const method = editRecord ? "PATCH" : "POST";

    // Normalise shorthand input: 29 → 1.029, 32 → 1.032
    const normalizedValue =
      data.readingValue > 1.1 ? 1 + data.readingValue / 1000 : data.readingValue;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, readingValue: normalizedValue }),
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
      title={editRecord ? "Edit Reading" : "Add Lactometer Reading"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              {...register("date")}
              className={inputClass}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Time
            </label>
            <input
              type="time"
              {...register("time")}
              className={inputClass}
            />
            {errors.time && (
              <p className="mt-1 text-xs text-red-500">{errors.time.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Branch
          </label>
          <select {...register("branchId")} className={inputClass}>
            <option value="">Select branch</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Reading Value
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            {...register("readingValue", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 1.029 or 29"
          />
          {errors.readingValue && (
            <p className="mt-1 text-xs text-red-500">
              {errors.readingValue.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Notes{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register("notes")}
            rows={2}
            className={inputClass}
            placeholder="Any additional notes..."
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
              : editRecord
              ? "Save Changes"
              : "Add Reading"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
