"use client";

import { useState, useCallback } from "react";
import { formatDate, formatTime, formatDateISO } from "@/lib/utils/date";
import { Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import PdfButton from "@/components/ui/PdfButton";

interface AuditLogEntry {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  /** Resolved name for the entity row (entityId unchanged). */
  entityName?: string | null;
  changes: unknown;
  createdAt: string;
  user: { id: string; fullName: string; role: string };
}

interface Props {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
  users: { id: string; fullName: string }[];
  entityTypes: string[];
}

const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function AuditLogClient({
  initialLogs,
  initialTotal,
  users,
  entityTypes,
}: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    entityType: "",
    entityId: "",
    dateFrom: "",
    dateTo: "",
  });

  const totalPages = Math.ceil(total / 20);

  const fetchLogs = useCallback(
    async (newPage: number, currentFilters: typeof filters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(newPage) });
        if (currentFilters.userId) params.set("userId", currentFilters.userId);
        if (currentFilters.action) params.set("action", currentFilters.action);
        if (currentFilters.entityType)
          params.set("entityType", currentFilters.entityType);
        if (currentFilters.entityId)
          params.set("entityId", currentFilters.entityId);
        if (currentFilters.dateFrom)
          params.set("dateFrom", currentFilters.dateFrom);
        if (currentFilters.dateTo) params.set("dateTo", currentFilters.dateTo);

        const res = await fetch(`/api/audit-logs?${params}`);
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setPage(newPage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleFilterChange(
    key: keyof typeof filters,
    value: string
  ) {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
  }

  function applyFilters() {
    fetchLogs(1, filters);
  }

  function resetFilters() {
    const empty = {
      userId: "",
      action: "",
      entityType: "",
      entityId: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(empty);
    fetchLogs(1, empty);
  }

  function exportCSV() {
    const rows = [
      ["Date/Time", "User", "Role", "Action", "Entity Type", "Entity ID", "Changes"],
      ...logs.map((l) => [
        `${formatDateISO(l.createdAt)} ${formatTime(l.createdAt)}`,
        l.user.fullName,
        l.user.role,
        l.action,
        l.entityType,
        l.entityId,
        l.changes ? JSON.stringify(l.changes) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${formatDateISO(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderChanges(changes: unknown) {
    if (!changes) return <span className="text-gray-400 text-xs">—</span>;
    try {
      const obj = typeof changes === "string" ? JSON.parse(changes) : changes;
      if (obj.before && obj.after) {
        const keys = Object.keys(obj.after);
        return (
          <div className="space-y-1">
            {keys.slice(0, 5).map((k) => (
              <div key={k} className="text-xs">
                <span className="font-medium text-gray-600">{k}:</span>{" "}
                <span className="text-red-500 line-through">{String(obj.before[k])}</span>{" "}
                <span className="text-green-600">→ {String(obj.after[k])}</span>
              </div>
            ))}
            {keys.length > 5 && (
              <p className="text-xs text-gray-400">+{keys.length - 5} more</p>
            )}
          </div>
        );
      }
      const entries = Object.entries(obj).slice(0, 5);
      return (
        <div className="space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="text-xs">
              <span className="font-medium text-gray-600">{k}:</span>{" "}
              <span className="text-gray-700">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <span className="text-xs text-gray-500 font-mono">{String(changes)}</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={filters.userId}
            onChange={(e) => handleFilterChange("userId", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>

          <select
            value={filters.action}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange("entityType", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Entity Types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Entity ID..."
            value={filters.entityId}
            onChange={(e) => handleFilterChange("entityId", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <PdfButton
            title="Audit Log"
            filename={`audit-log-${new Date().toISOString().split("T")[0]}.pdf`}
            columns={[
              { key: "dateTime", label: "Date/Time" },
              { key: "user", label: "User" },
              { key: "role", label: "Role" },
              { key: "action", label: "Action" },
              { key: "entityType", label: "Entity Type" },
              { key: "entityId", label: "Entity ID" },
            ]}
            rows={logs.map((l) => ({
              dateTime: new Date(l.createdAt).toLocaleString(),
              user: l.user.fullName,
              role: l.user.role,
              action: l.action,
              entityType: l.entityType,
              entityId: l.entityName ?? l.entityId,
            }))}
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 px-1">
        Showing{" "}
        <span className="font-medium text-gray-800">{logs.length}</span> of{" "}
        <span className="font-medium text-gray-800">{total}</span> entries
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No audit log entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date / Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                        <span className="ml-1 text-gray-400">
                          {formatTime(log.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">
                          {log.user.fullName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {log.user.role.replace(/_/g, " ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action]}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">
                          {log.entityType}
                        </p>
                        {log.entityName ? (
                          <p
                            className="text-xs text-gray-800 truncate max-w-[200px]"
                            title={log.entityName}
                          >
                            {log.entityName}
                          </p>
                        ) : null}
                        <p
                          className="text-xs text-gray-400 font-mono truncate max-w-[200px]"
                          title={log.entityId}
                        >
                          {log.entityId}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {renderChanges(log.changes)}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-expanded`} className="bg-gray-50">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="text-xs">
                            <p className="font-semibold text-gray-700 mb-1">
                              Full Changes
                              {log.entityName
                                ? ` (${log.entityName})`
                                : ` (Entity ID: ${log.entityId})`}
                            </p>
                            <pre className="bg-white rounded p-3 border border-gray-200 overflow-x-auto text-gray-600 text-xs">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => fetchLogs(page - 1, filters)}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum =
                totalPages <= 5
                  ? i + 1
                  : page <= 3
                  ? i + 1
                  : page >= totalPages - 2
                  ? totalPages - 4 + i
                  : page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchLogs(pageNum, filters)}
                  disabled={loading}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? "bg-green-700 text-white"
                      : "border border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => fetchLogs(page + 1, filters)}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
