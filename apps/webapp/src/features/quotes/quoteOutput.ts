/**
 * PDF und Versand eines Angebots (bautakt-app#183).
 *
 * Das PDF rendert die Edge Function `quote-document-render` mit demselben Kern
 * wie bei Rechnungen. Eine festgeschriebene Version hat ein Original im Archiv
 * (`finance-documents/{company}/sales/quotes/…`), das genau einmal entsteht;
 * ein Entwurf bekommt nur eine Vorschau, die nirgends gespeichert wird.
 *
 * Versendet wird über `mail-send` mit Zweck `quote`. Anhang ist das Original
 * der Version oder eine Auftragsbestätigung dazu, Absender und Modus bestimmt
 * der Server.
 *
 * Auftragsbestätigung (bautakt-app#187): Die Function vergibt die Nummer und
 * schreibt das PDF genau einmal je Annahme; ein zweiter Aufruf liefert dieselbe.
 */

import { supabase } from '@/lib/supabase';

import type { SendBody, SendChannel } from '../finance/SendDialog';

const RENDER_FUNCTION = 'quote-document-render';

type ArchiveResult = { ok: true; storage_path: string; content_hash: string };
type PreviewResult = { ok: true; pdf_base64: string; fingerprint: string };
type ConfirmationResult = {
  ok: true;
  confirmation_id: string;
  document_number: string;
  storage_path: string;
};

async function invokeRender<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(RENDER_FUNCTION, { body });
  if (error) {
    const response: unknown = (error as { context?: unknown }).context;
    const payload =
      response instanceof Response
        ? ((await response.json().catch(() => null)) as { error?: string } | null)
        : null;
    throw new Error(payload?.error ?? 'QUOTE_RENDER_FAILED');
  }
  return data as T;
}

/**
 * Original einer festgeschriebenen Version sicherstellen. Gibt es schon, kommt
 * nur der vorhandene Pfad zurück; sonst schreibt die Function es jetzt.
 */
export async function ensureQuoteOriginal(versionId: string): Promise<string> {
  const result = await invokeRender<ArchiveResult>({ version_id: versionId, mode: 'archive' });
  return result.storage_path;
}

/** Auftragsbestätigung der angenommenen Version sicherstellen. */
export async function ensureOrderConfirmation(versionId: string): Promise<ConfirmationResult> {
  return invokeRender<ConfirmationResult>({
    version_id: versionId,
    mode: 'archive',
    document: 'order_confirmation',
  });
}

/** Datei aus dem Archiv als PDF. */
async function archivedBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from('finance-documents').download(path);
  if (error || !data) throw error ?? new Error('ARCHIVE_MISSING');
  return new Blob([await data.arrayBuffer()], { type: 'application/pdf' });
}

/** PDF in einem Tab, der sofort aufgeht und die Datei übernimmt, sobald sie da ist. */
async function showInTab(load: () => Promise<Blob>): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await load());
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    // Der Tab hat die Datei dann übernommen.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (cause) {
    tab?.close();
    throw cause;
  }
}

/** Auftragsbestätigung öffnen; fehlt sie noch, entsteht sie jetzt. */
export async function openOrderConfirmationPdf(input: {
  versionId: string;
  storagePath: string | null;
}): Promise<void> {
  await showInTab(async () =>
    archivedBlob(
      input.storagePath ?? (await ensureOrderConfirmation(input.versionId)).storage_path,
    ),
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * PDF in einem neuen Tab. Das Fenster öffnet sofort (sonst blockiert der
 * Browser das Popup nach dem Warten) und bekommt die Datei, sobald sie da ist.
 */
export async function openQuotePdf(version: {
  id: string;
  issued_at: string | null;
  storage_path: string | null;
}): Promise<void> {
  await showInTab(async () => {
    if (version.issued_at) {
      return archivedBlob(version.storage_path ?? (await ensureQuoteOriginal(version.id)));
    }
    const preview = await invokeRender<PreviewResult>({ version_id: version.id, mode: 'preview' });
    return new Blob([base64ToBytes(preview.pdf_base64).slice()], { type: 'application/pdf' });
  });
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Klartext als Mail-HTML wie in `finance-document-send`: Leerzeile = Absatz. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const escaped = paragraph.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
      return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

/** Kanal für den Versanddialog: direkt an `mail-send`, Zweck `quote`. */
export function quoteMailChannel(input: {
  companyId: string;
  versionId: string;
  storagePath: string;
  fileName: string;
  invalidateKeys: readonly (readonly unknown[])[];
}): SendChannel {
  return {
    functionName: 'mail-send',
    invalidateKeys: input.invalidateKeys,
    toBody: (body: SendBody & { preview?: boolean; idempotencyKey?: string }) => ({
      companyId: input.companyId,
      purpose: 'quote',
      to: body.to,
      subject: body.subject,
      html: textToHtml(body.text),
      attachments: [{ storagePath: input.storagePath, fileName: input.fileName }],
      context: { quoteVersionId: input.versionId },
      ...(body.preview ? { preview: true } : {}),
      ...(body.idempotencyKey ? { idempotencyKey: body.idempotencyKey } : {}),
    }),
  };
}
