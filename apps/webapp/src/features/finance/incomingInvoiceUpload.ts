/**
 * Upload einer Eingangsrechnung (bautakt-web#88, Teil 2), ohne React und ohne
 * Supabase, damit es mit `node --test` läuft.
 *
 * Zwei Edge Functions sind beteiligt:
 *
 * - `finance-inbound-store` legt die Datei ab und setzt Pfad und Prüfwert am
 *   Entwurf. Nur der Server darf das (#161).
 * - `finance-inbound-parse` liest E-Rechnungen (XRechnung, ZUGFeRD) aus dem
 *   XML. Aus Scans und Fotos wird bewusst nichts gelesen.
 *
 * Was aus der E-Rechnung kommt, ist ein Vorschlag: Er füllt nur leere Felder
 * und bleibt im Formular markiert, bis jemand das Feld anfasst.
 */

/** Was der Dateidialog anbietet. Die Function prüft den Inhalt noch einmal. */
export const UPLOAD_ACCEPT =
  'application/pdf,.pdf,application/xml,text/xml,.xml,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

/** Wie `MAX_BYTES` in `finance-inbound-store`. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type UploadKind = 'pdf' | 'xml' | 'image';

/** Art der Datei aus Typ und Endung; `null` heißt: nicht annehmen. */
export function uploadKind(name: string, mimeType: string): UploadKind | null {
  const type = mimeType.toLowerCase();
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (type === 'application/xml' || type === 'text/xml' || ext === 'xml') return 'xml';
  if (['image/jpeg', 'image/png', 'image/webp'].includes(type)) return 'image';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  return null;
}

/** Schlüssel unter `domain:incomingInvoiceForm.upload.errors`. */
export type StoreErrorKey =
  'forbidden' | 'tooLarge' | 'unsupported' | 'fileExists' | 'notDraft' | 'invalid' | 'unknown';

export type StoredFile = { id: string; storagePath: string; mimeType: string };

/** Antwort von `finance-inbound-store` auf einen Fehlerschlüssel abbilden. */
export function storeErrorKey(status: number, body: unknown): StoreErrorKey {
  const error = isRecord(body) && typeof body.error === 'string' ? body.error : '';
  if (status === 403) return 'forbidden';
  if (status === 413) return 'tooLarge';
  if (status === 415) return 'unsupported';
  if (status === 409) return error === 'not_draft' ? 'notDraft' : 'fileExists';
  if (status === 400) return 'invalid';
  return 'unknown';
}

/**
 * Erfolgsantwort prüfen. Ohne Pfad und SHA-256 gilt der Upload als
 * gescheitert, auch bei Status 200.
 */
export function storedFile(body: unknown): StoredFile | null {
  if (!isRecord(body) || body.ok !== true) return null;
  const { id, storage_path: storagePath, content_hash: hash, mime_type: mimeType } = body;
  if (typeof id !== 'string' || typeof storagePath !== 'string' || !storagePath) return null;
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) return null;
  return { id, storagePath, mimeType: typeof mimeType === 'string' ? mimeType : '' };
}

/** Vorschlag aus der E-Rechnung. Beträge in Cent. */
export type InvoiceSuggestion = {
  vendorName?: string;
  vendorVatId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  netMinor?: number;
  vatMinor?: number;
  grossMinor?: number;
  sourceFormat: 'zugferd' | 'xrechnung';
};

export type ParseOutcome =
  | { status: 'none' }
  /** `foreignCurrency`: Beträge nicht übernommen, das Formular kennt nur Euro. */
  | { status: 'suggested'; suggestion: InvoiceSuggestion; foreignCurrency: string | null };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Antwort von `finance-inbound-parse` in einen Vorschlag übersetzen.
 *
 * Nur bei `extracted: true` (Lieferant, Nummer und Brutto standen wirklich im
 * Dokument). Das Rechnungsdatum nur, wenn BT-2 gefunden wurde; sonst setzt die
 * Function „heute“ ein, und das ist keine Angabe der Rechnung.
 */
export function parseOutcome(body: unknown): ParseOutcome {
  if (!isRecord(body) || body.extracted !== true) return { status: 'none' };
  const format = body.sourceFormat;
  if (format !== 'zugferd' && format !== 'xrechnung') return { status: 'none' };

  const suggestion: InvoiceSuggestion = { sourceFormat: format };
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

  if (text(body.vendorName)) suggestion.vendorName = text(body.vendorName);
  if (text(body.vendorVatId)) suggestion.vendorVatId = text(body.vendorVatId);
  if (text(body.invoiceNumber)) suggestion.invoiceNumber = text(body.invoiceNumber);

  const payload = isRecord(body.parsedPayload) ? body.parsedPayload : {};
  const found = Array.isArray(payload.foundFields) ? payload.foundFields : [];
  if (found.includes('BT-2') && ISO_DATE.test(text(body.invoiceDate))) {
    suggestion.invoiceDate = text(body.invoiceDate);
  }
  if (ISO_DATE.test(text(body.dueDate))) suggestion.dueDate = text(body.dueDate);

  const currency = text(body.currency).toUpperCase() || 'EUR';
  if (currency === 'EUR') {
    const net = toMinor(body.netTotal);
    const vat = toMinor(body.vatTotal);
    const gross = toMinor(body.grossTotal);
    if (net !== null) suggestion.netMinor = net;
    if (vat !== null) suggestion.vatMinor = vat;
    if (gross !== null) suggestion.grossMinor = gross;
  }

  return { status: 'suggested', suggestion, foreignCurrency: currency === 'EUR' ? null : currency };
}

/** Werte, wie sie im Formular stehen. Beträge als Eingabetext. */
export type SuggestibleValues = {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  net: string;
  vat: string;
  gross: string;
};

export type SuggestibleField = keyof SuggestibleValues;

/**
 * Vorschlag in die Formularwerte legen. Gefüllt wird nur, was leer ist; das
 * Rechnungsdatum auch dann, wenn noch die Vorbelegung (heute) drinsteht.
 * Was schon jemand eingetragen hat, bleibt stehen.
 *
 * `formatAmount` macht aus Cent den Eingabetext (`formatMoneyInput`).
 */
export function applySuggestion(
  current: SuggestibleValues,
  suggestion: InvoiceSuggestion,
  defaultDate: string,
  formatAmount: (minor: number) => string,
): { values: SuggestibleValues; filled: SuggestibleField[] } {
  const values = { ...current };
  const filled: SuggestibleField[] = [];
  const offer = (field: SuggestibleField, value: string | undefined, replaceable = '') => {
    if (value === undefined) return;
    const now = current[field].trim();
    if (now && now !== replaceable) return;
    values[field] = value;
    filled.push(field);
  };

  offer('vendorName', suggestion.vendorName);
  offer('invoiceNumber', suggestion.invoiceNumber);
  offer('invoiceDate', suggestion.invoiceDate, defaultDate);
  offer('dueDate', suggestion.dueDate);
  const amount = (minor: number | undefined) =>
    minor === undefined ? undefined : formatAmount(minor);
  offer('net', amount(suggestion.netMinor));
  offer('vat', amount(suggestion.vatMinor));
  offer('gross', amount(suggestion.grossMinor));

  return { values, filled };
}

function toMinor(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
