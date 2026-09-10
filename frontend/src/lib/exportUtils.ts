/**
 * File Export Utilities for CSV and JSON downloads
 */

export function exportToJson(data: any, baseFilename: string) {
  if (!data) return;
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${baseFilename}_${getTimestampSuffix()}.json`);
}

export function exportToCsv(data: Record<string, any>[], baseFilename: string, customHeaders?: { key: string; label: string }[]) {
  if (!data || data.length === 0) return;

  const headers = customHeaders || Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const headerRow = headers.map(h => escapeCsvCell(h.label)).join(',');

  const rows = data.map(item => {
    return headers.map(h => {
      const val = item[h.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return escapeCsvCell(JSON.stringify(val));
      return escapeCsvCell(String(val));
    }).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${baseFilename}_${getTimestampSuffix()}.csv`);
}

function escapeCsvCell(cell: string): string {
  const escaped = cell.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getTimestampSuffix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}
