/**
 * PDF und Versand eines Angebots (bautakt-app#183).
 *
 * Das PDF rendert die Edge Function `quote-document-render` mit demselben Kern
 * wie bei Rechnungen. Eine festgeschriebene Version hat ein Original im Archiv
 * (`finance-documents/{company}/sales/quotes/…`), das genau einmal entsteht;
 * ein Entwurf bekommt nur eine Vorschau, die nirgends gespeichert wird.
 *
 * Versendet wird über `mail-send` mit Zweck `quote`. Anhang ist immer das
 * Original der Version, Absender und Modus bestimmt der Server.
 */

import { supabase } from '@/lib/supabase';

import type { SendBody, SendChannel } from '../finance/SendDialog';

const RENDER_FUNCTION = 'quote-document-render';

type ArchiveResult = { ok: true; storage_path: string; content_hash: string };
type PreviewResult = { ok: true; pdf_base64: string; fingerprint: string };

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
  const tab = window.open('', '_blank');
  try {
    let blob: Blob;
    if (version.issued_at) {
      const path = version.storage_path ?? (await ensureQuoteOriginal(version.id));
      const { data, error } = await supabase.storage.from('finance-documents').download(path);
      if (error || !data) throw error ?? new Error('ARCHIVE_MISSING');
      blob = new Blob([await data.arrayBuffer()], { type: 'application/pdf' });
    } else {
      const preview = await invokeRender<PreviewResult>({
        version_id: version.id,
        mode: 'preview',
      });
      blob = new Blob([base64ToBytes(preview.pdf_base64).slice()], { type: 'application/pdf' });
    }
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    // Der Tab hat die Datei dann übernommen.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (cause) {
    tab?.close();
    throw cause;
  }
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
