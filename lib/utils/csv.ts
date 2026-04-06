/**
 * Generates a CSV string from an array of objects.
 * @param headers - Array of {key, label} pairs defining columns
 * @param rows - Array of data objects
 */
export function generateCSV<T extends Record<string, unknown>>(
  headers: { key: keyof T; label: string }[],
  rows: T[]
): string {
  const escape = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map((h) => escape(h.label)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escape(row[h.key])).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 * Call this from a client component only.
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
