/**
 * Dateien am Auftrag (`order_documents`), ohne React und ohne Supabase, damit
 * es mit `node --test` läuft.
 *
 * Dieselben Regeln wie in der Handy-App (`orderDocumentConstants.ts`,
 * `documentStorage.ts`). Der Bucket `order-documents` nimmt nur diese Typen
 * und höchstens 10 MB an; die Prüfung hier erspart nur den Umweg über eine
 * Fehlermeldung des Speichers.
 */

export const ORDER_DOCUMENTS_BUCKET = 'order-documents';
export const FINANCE_DOCUMENTS_BUCKET = 'finance-documents';

/** Dieselbe Frist wie in der Handy-App. */
export const ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS = 3600;

/** `file_size_limit` des Buckets `order-documents`. */
export const MAX_ORDER_DOCUMENT_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
} as const;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

/** Was der Dateidialog anbietet. */
export const ORDER_DOCUMENT_ACCEPT = [
  ...new Set(Object.values(MIME_BY_EXTENSION)),
  ...Object.keys(MIME_BY_EXTENSION),
].join(',');

/** `.pdf` aus „Plan.PDF“; leer ohne Endung. Wie `extensionFromFileName` der App. */
export function fileExtension(fileName: string): string {
  const match = fileName.match(/(\.[a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

/**
 * Der Typ, unter dem die Datei gespeichert wird; `null` heißt: nicht
 * annehmen. Browser liefern für Word-Dateien manchmal keinen Typ, dann
 * entscheidet die Endung.
 */
export function orderDocumentMimeType(fileName: string, browserType: string): string | null {
  const type = browserType.toLowerCase();
  if (type in EXTENSION_BY_MIME) return type;
  const ext = fileExtension(fileName);
  return ext in MIME_BY_EXTENSION ? MIME_BY_EXTENSION[ext as keyof typeof MIME_BY_EXTENSION] : null;
}

/** `{companyId}/{orderId}/{documentId}.pdf` — wie `buildOrderDocumentStoragePath`. */
export function orderDocumentStoragePath(
  companyId: string,
  orderId: string,
  documentId: string,
  mimeType: string,
  fileName: string,
): string {
  const ext = fileExtension(fileName) || EXTENSION_BY_MIME[mimeType] || '';
  return `${companyId}/${orderId}/${documentId}${ext}`;
}

/** Vorschlag für den Anzeigenamen: der Dateiname ohne Endung. */
export function defaultDocumentName(fileName: string): string {
  const ext = fileExtension(fileName);
  const base = ext ? fileName.slice(0, -ext.length) : fileName;
  return base.trim() || fileName.trim();
}

/**
 * Rechnungen und Angebote sind keine Kopie, sondern zeigen auf das
 * Belegarchiv: `{companyId}/sales/{salesDocumentId}.pdf` im Bucket
 * `finance-documents`. Unterschieden wird am Pfad wie in der App
 * (`isFinanceArchivePath`); an zweiter Stelle steht sonst die Auftrags-UUID.
 * Beim Löschen des Eintrags bleibt die Archivdatei unangetastet.
 */
export function isFinanceArchivePath(storagePath: string): boolean {
  return storagePath.split('/')[1] === 'sales';
}

export function orderDocumentBucket(storagePath: string): string {
  return isFinanceArchivePath(storagePath) ? FINANCE_DOCUMENTS_BUCKET : ORDER_DOCUMENTS_BUCKET;
}

export type OrderDocumentKind = 'pdf' | 'image' | 'text' | 'other';

export function orderDocumentKind(mimeType: string, fileName: string): OrderDocumentKind {
  const type = mimeType || orderDocumentMimeType(fileName, '') || '';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type === 'text/plain' || type.includes('word')) return 'text';
  return 'other';
}

const sizeFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/** „840 KB“, „2,4 MB“; leer ohne Größe. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export type DocumentFolder<T> = { id: string; name: string; documents: T[] };

/**
 * Dokumente nach Ordner, in der Reihenfolge der Ordner. Leere Ordner fehlen;
 * ein Dokument in einem unbekannten Ordner landet am Ende unter `unknownName`.
 */
export function groupByFolder<T extends { categoryId: string }>(
  documents: T[],
  categories: { id: string; name: string }[],
  unknownName: string,
): DocumentFolder<T>[] {
  const folders = new Map<string, DocumentFolder<T>>(
    categories.map((item) => [item.id, { id: item.id, name: item.name, documents: [] }]),
  );
  const unknown: DocumentFolder<T> = { id: '', name: unknownName, documents: [] };
  for (const document of documents) {
    (folders.get(document.categoryId) ?? unknown).documents.push(document);
  }
  return [...folders.values(), unknown].filter((folder) => folder.documents.length > 0);
}
