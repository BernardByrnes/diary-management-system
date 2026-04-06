"use client";

import { useState, useCallback } from "react";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import {
  Settings,
  FlaskConical,
  DollarSign,
  Bell,
  Tag,
  Plus,
  X,
  Save,
  ChevronRight,
  Calendar,
  Trash2,
} from "lucide-react";
import { UGANDA_FIXED_PUBLIC_HOLIDAYS } from "@/lib/utils/uganda-fixed-holidays";

let toastCounter = 0;

interface SystemSettings {
  id: string;
  organizationName: string;
  currencySymbol: string;
  financialYearStartMonth: number;
  lactometerMin: string;
  lactometerMax: string;
  minReadingsPerWeek: number;
  advanceWarningThreshold: string;
  discrepancyThreshold: string;
  customExpenseCategories: string[];
  publicHolidays: { date: string; name: string }[];
  defaultRentCycle: "ANNUAL" | "BI_ANNUAL";
}

const BUILT_IN_CATEGORIES = [
  "SALARIES",
  "MEALS",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "MAINTENANCE",
  "MISCELLANEOUS",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  initialSettings: SystemSettings;
}

export default function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<{
    index: number;
    value: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const customCategories: string[] = Array.isArray(settings.customExpenseCategories)
    ? settings.customExpenseCategories
    : [];

  async function saveSection(
    sectionKey: string,
    data: Partial<SystemSettings>
  ) {
    setSaving(sectionKey);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSettings(json);
      showToast("success", "Settings saved successfully");
    } catch {
      showToast("error", "Failed to save settings");
    } finally {
      setSaving(null);
    }
  }

  function addCustomCategory() {
    const name = newCategory.trim().toUpperCase();
    if (!name) return;
    if (BUILT_IN_CATEGORIES.includes(name)) {
      showToast("error", "This category already exists as a built-in category");
      return;
    }
    if (customCategories.includes(name)) {
      showToast("error", "This custom category already exists");
      return;
    }
    const updated = [...customCategories, name];
    saveSection("categories", { customExpenseCategories: updated });
    setNewCategory("");
  }

  function removeCustomCategory(index: number) {
    const updated = customCategories.filter((_, i) => i !== index);
    saveSection("categories", { customExpenseCategories: updated });
  }

  function saveRenameCategory() {
    if (!editingCategory) return;
    const name = editingCategory.value.trim().toUpperCase();
    if (!name) return;
    if (BUILT_IN_CATEGORIES.includes(name)) {
      showToast("error", "Cannot rename to a built-in category name");
      return;
    }
    const updated = customCategories.map((c, i) =>
      i === editingCategory.index ? name : c
    );
    saveSection("categories", { customExpenseCategories: updated });
    setEditingCategory(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* General Settings */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Settings className="w-4 h-4 text-green-700" />
          </div>
          <h2 className="font-semibold text-gray-900">General Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organisation Name
              </label>
              <input
                type="text"
                value={settings.organizationName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, organizationName: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, currencySymbol: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="sm:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Financial Year Start Month
            </label>
            <select
              value={settings.financialYearStartMonth}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  financialYearStartMonth: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() =>
                saveSection("general", {
                  organizationName: settings.organizationName,
                  currencySymbol: settings.currencySymbol,
                  financialYearStartMonth: settings.financialYearStartMonth,
                })
              }
              disabled={saving === "general"}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving === "general" ? "Saving..." : "Save General"}
            </button>
          </div>
        </div>
      </section>

      {/* Quality Settings */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-blue-700" />
          </div>
          <h2 className="font-semibold text-gray-900">Quality Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lactometer Min (acceptable)
              </label>
              <input
                type="number"
                step="0.001"
                value={settings.lactometerMin}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, lactometerMin: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lactometer Max (acceptable)
              </label>
              <input
                type="number"
                step="0.001"
                value={settings.lactometerMax}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, lactometerMax: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Min Readings / Week
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.minReadingsPerWeek}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    minReadingsPerWeek: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Readings outside the min–max range trigger an immediate high-priority
            alert to the Executive Director.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() =>
                saveSection("quality", {
                  lactometerMin: settings.lactometerMin,
                  lactometerMax: settings.lactometerMax,
                  minReadingsPerWeek: settings.minReadingsPerWeek,
                })
              }
              disabled={saving === "quality"}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving === "quality" ? "Saving..." : "Save Quality"}
            </button>
          </div>
        </div>
      </section>

      {/* Financial Settings */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-amber-700" />
          </div>
          <h2 className="font-semibold text-gray-900">Financial Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Advance Warning Threshold (UGX)
              </label>
              <input
                type="number"
                min="0"
                value={settings.advanceWarningThreshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    advanceWarningThreshold: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Warn when a recipient's outstanding advances exceed this amount
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Banking Discrepancy Threshold (UGX)
              </label>
              <input
                type="number"
                min="0"
                value={settings.discrepancyThreshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    discrepancyThreshold: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Flag a banking discrepancy when the gap exceeds this amount
              </p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Supplier Payment Periods
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Period 1: 1st – 15th (due on 15th) &nbsp;|&nbsp; Period 2: 16th
                  – month-end (due on last day). Due dates that fall on a weekend
                  or a listed public holiday roll back to the previous working
                  day (see Calendar section below).
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() =>
                saveSection("financial", {
                  advanceWarningThreshold: settings.advanceWarningThreshold,
                  discrepancyThreshold: settings.discrepancyThreshold,
                })
              }
              disabled={saving === "financial"}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving === "financial" ? "Saving..." : "Save Financial"}
            </button>
          </div>
        </div>
      </section>

      {/* Public holidays & default rent */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-teal-700" />
          </div>
          <h2 className="font-semibold text-gray-900">Calendar &amp; rent defaults</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="sm:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Default rent payment cycle (branches can override)
            </label>
            <select
              value={settings.defaultRentCycle}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaultRentCycle: e.target.value as "ANNUAL" | "BI_ANNUAL",
                }))
              }
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="ANNUAL">Annual</option>
              <option value="BI_ANNUAL">Every six months (biannual)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Used as a reminder when recording rent expenses. Branches can set their own cycle
              on the branch profile.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Public holidays (movable dates)
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    publicHolidays: [...s.publicHolidays, { date: "", name: "" }],
                  }))
                }
                className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add row
              </button>
            </div>
            <div className="mb-4 p-3 bg-teal-50/80 border border-teal-100 rounded-lg text-xs text-teal-900 space-y-2">
              <p className="font-medium text-teal-950">Uganda fixed holidays (automatic)</p>
              <p className="text-teal-900/90">
                These are already treated as non-working days for payment scheduling (same as
                weekends). You do not need to enter them below.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-teal-900/85 columns-1 sm:columns-2 gap-x-4">
                {UGANDA_FIXED_PUBLIC_HOLIDAYS.map((h) => {
                  const label = new Date(2000, h.month, h.day).toLocaleString("en-GB", {
                    month: "long",
                    day: "numeric",
                  });
                  return (
                    <li key={`${h.month}-${h.day}`}>
                      {label} — {h.name}
                    </li>
                  );
                })}
              </ul>
              <p className="text-teal-800/90 pt-1">
                Good Friday, Easter Monday, Eid al-Fitr, and Eid al-Adha change each year — add those
                under &ldquo;movable dates&rdquo; below when announced.
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add dates each year for Eid, Easter-related days if needed, and any other non-working
              days your cooperative observes. Supplier payment due dates skip these together with
              weekends and the fixed holidays above.
            </p>
            {settings.publicHolidays.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No extra holidays listed.</p>
            ) : (
              <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden">
                {settings.publicHolidays.map((row, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-2 p-3 bg-gray-50/80 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-gray-500">Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => {
                          const next = [...settings.publicHolidays];
                          next[i] = { ...next[i], date: e.target.value };
                          setSettings((s) => ({ ...s, publicHolidays: next }));
                        }}
                        className="w-full mt-0.5 px-2 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex-[2] min-w-[160px]">
                      <label className="text-xs text-gray-500">Label (e.g. Eid al-Fitr)</label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...settings.publicHolidays];
                          next[i] = { ...next[i], name: e.target.value };
                          setSettings((s) => ({ ...s, publicHolidays: next }));
                        }}
                        className="w-full mt-0.5 px-2 py-2 text-sm border border-gray-300 rounded-lg"
                        placeholder="Optional"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          publicHolidays: s.publicHolidays.filter((_, j) => j !== i),
                        }))
                      }
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() =>
                saveSection("calendar", {
                  publicHolidays: settings.publicHolidays.filter((h) => h.date.trim() !== ""),
                  defaultRentCycle: settings.defaultRentCycle,
                })
              }
              disabled={saving === "calendar"}
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving === "calendar" ? "Saving..." : "Save calendar & rent"}
            </button>
          </div>
        </div>
      </section>

      {/* Expense Categories */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Tag className="w-4 h-4 text-purple-700" />
          </div>
          <h2 className="font-semibold text-gray-900">Expense Categories</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Built-in */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Built-in Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {BUILT_IN_CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {cat}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Built-in categories cannot be modified or deleted.
            </p>
          </div>

          {/* Custom */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Custom Categories
            </p>
            {customCategories.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No custom categories yet.
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {customCategories.map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {editingCategory?.index === i ? (
                      <>
                        <input
                          type="text"
                          value={editingCategory.value}
                          onChange={(e) =>
                            setEditingCategory({
                              index: i,
                              value: e.target.value.toUpperCase(),
                            })
                          }
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={saveRenameCategory}
                          className="text-xs text-green-700 font-medium hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Tag className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="flex-1 text-sm font-medium text-gray-700">
                          {cat}
                        </span>
                        <button
                          onClick={() =>
                            setEditingCategory({ index: i, value: cat })
                          }
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => removeCustomCategory(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="NEW CATEGORY NAME"
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value.toUpperCase())
                }
                onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase placeholder:normal-case placeholder:text-gray-400"
              />
              <button
                onClick={addCustomCategory}
                disabled={!newCategory.trim() || saving === "categories"}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Info footer */}
      <div className="flex items-center gap-2 px-1 text-xs text-gray-400">
        <ChevronRight className="w-3.5 h-3.5" />
        All settings take effect immediately after saving.
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
