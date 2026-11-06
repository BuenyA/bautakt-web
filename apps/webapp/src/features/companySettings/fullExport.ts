/**
 * Vollexport als ZIP (Löschkonzept WP2, bautakt-app `supabase/functions/company-full-export`).
 * Hier nur die Antwort der Function in einen Anzeigezustand übersetzen, ohne React.
 */

export type ExportDownload = {
  file: string;
  kind: 'data' | 'files' | 'manifest';
  bytes: number | null;
  sha256: string | null;
  url: string;
};

export type ExportStatus = {
  id: string;
  status: 'requested' | 'running' | 'completed' | 'failed';
  requested_at: string;
  completed_at: string | null;
  files_valid_until: string | null;
  row_count: number | null;
  file_count: number | null;
  total_bytes: number | null;
  manifest_sha256: string | null;
  parts_total: number;
  parts_done: number;
  expired: boolean;
  downloads: ExportDownload[];
};

export type ExportResponse = { export: ExportStatus | null };

export type ExportView =
  | { kind: 'none' }
  | { kind: 'running'; done: number; total: number; requestedAt: string }
  | {
      kind: 'ready';
      downloads: ExportDownload[];
      validUntil: string;
      completedAt: string;
      fileCount: number;
      rowCount: number;
    }
  | { kind: 'expired'; completedAt: string }
  | { kind: 'failed'; requestedAt: string };

export function exportView(response: ExportResponse | undefined): ExportView {
  const row = response?.export;
  if (!row) return { kind: 'none' };
  if (row.status === 'requested' || row.status === 'running') {
    // Vor dem ersten Schritt ist die Zahl der Teile noch unbekannt.
    return {
      kind: 'running',
      done: row.parts_done,
      total: row.parts_total,
      requestedAt: row.requested_at,
    };
  }
  if (row.status === 'failed') return { kind: 'failed', requestedAt: row.requested_at };
  if (row.expired || row.downloads.length === 0)
    return { kind: 'expired', completedAt: row.completed_at ?? row.requested_at };
  return {
    kind: 'ready',
    downloads: row.downloads,
    validUntil: row.files_valid_until ?? '',
    completedAt: row.completed_at ?? '',
    fileCount: row.file_count ?? 0,
    rowCount: row.row_count ?? 0,
  };
}

/** Größe für Menschen, deutsch gerundet. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units[unit]}`;
}

/** Fehler der Function in einen Übersetzungsschlüssel. */
export function exportErrorKey(error: string | undefined): string {
  if (error === 'export not available in this lifecycle state')
    return 'companySettings:export.errors.lifecycle';
  if (error === 'export already running') return 'companySettings:export.errors.running';
  if (error === 'permission denied: owner required') return 'companySettings:export.errors.owner';
  return 'companySettings:export.errors.unknown';
}

/** Solange ein Export läuft, regelmäßig nachfragen; der Abruf stößt die Kette auch an. */
export function pollInterval(view: ExportView): number | false {
  return view.kind === 'running' ? 5000 : false;
}
