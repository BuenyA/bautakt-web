/**
 * Mail-Anhänge, bei denen eine Person entscheidet, ob sie eine Rechnung sind
 * (bautakt-web#281), ohne React und ohne Supabase, damit es mit `node --test`
 * läuft. Das Schema steht im Wiki von `bautakt-app`.
 */

export type InboundFileRaw = {
  id: string;
  file_name: string;
  status: string;
  storage_path: string;
  created_at: string;
  inbound_mails: {
    from_email: string | null;
    subject: string | null;
    received_at: string;
  } | null;
};

export type InboundFile = {
  id: string;
  fileName: string;
  storagePath: string;
  fromEmail: string | null;
  subject: string | null;
  receivedAt: string;
};

export type InboundFileLists = { toReview: InboundFile[]; notInvoice: InboundFile[] };

function toFile(row: InboundFileRaw): InboundFile {
  return {
    id: row.id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    fromEmail: row.inbound_mails?.from_email ?? null,
    subject: row.inbound_mails?.subject ?? null,
    receivedAt: row.inbound_mails?.received_at ?? row.created_at,
  };
}

const newestFirst = (a: InboundFile, b: InboundFile) =>
  Date.parse(b.receivedAt) - Date.parse(a.receivedAt);

/** Teilt nach Stand. Schon erfasste Dateien stehen in den Eingangsrechnungen. */
export function splitInboundFiles(rows: readonly InboundFileRaw[]): InboundFileLists {
  return {
    toReview: rows
      .filter((row) => row.status === 'to_review')
      .map(toFile)
      .sort(newestFirst),
    notInvoice: rows
      .filter((row) => row.status === 'not_invoice')
      .map(toFile)
      .sort(newestFirst),
  };
}

export type InboundFileDecision = 'invoice' | 'not_invoice';

export type ResolvedInboundFile = { status: InboundFileDecision; invoiceId: string | null };

/** Antwort der RPC. Alles andere gilt als nicht gespeichert. */
export function resolvedInboundFile(data: unknown): ResolvedInboundFile | null {
  if (typeof data !== 'object' || data === null) return null;
  const { status, invoice_id: invoiceId } = data as { status?: unknown; invoice_id?: unknown };
  if (status === 'invoice' && typeof invoiceId === 'string') return { status, invoiceId };
  if (status === 'not_invoice') return { status, invoiceId: null };
  return null;
}

export type InboundFileErrorKey = 'forbidden' | 'alreadyInvoice' | 'notSaved';

/** Fehlercodes der RPC auf Textschlüssel. Unbekanntes gibt `null`. */
export function inboundFileErrorKey(
  message: string | null | undefined,
): InboundFileErrorKey | null {
  const raw = message ?? '';
  if (/\bforbidden\b/.test(raw)) return 'forbidden';
  if (raw.includes('inbound_file_already_invoice')) return 'alreadyInvoice';
  if (raw.includes('inbound_file_not_saved') || raw.includes('inbound_file_decision_invalid')) {
    return 'notSaved';
  }
  return null;
}
