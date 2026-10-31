import type { RenderBundle } from '@bautakt/document-render';

import { supabase } from '@/lib/supabase';

/**
 * Live-Vorschau im Browser (bautakt-web#160).
 *
 * Die Function liefert einmal das Bündel (`bundle_only`), der Web Worker
 * rendert damit jeden Formularstand mit demselben Kern wie der Server. Ein
 * neues Bündel braucht es nur, wenn sich Betrieb, Kunde, Bezug oder die
 * abgezogenen Abschläge ändern — sonst bleibt jede Tipp-Pause lokal.
 *
 * Jeder Fehler hier ist kein Nutzerfehler: `useLivePreview` fällt dann auf
 * die Server-Vorschau zurück (#150/#152).
 */

export type DraftBody = { document: Record<string, unknown>; lines: Record<string, unknown>[] };

type Logo = { bytes: Uint8Array; mime: string };

export type RenderRequest = {
  id: number;
  draft: DraftBody;
  bundle: RenderBundle;
  logo: Logo | null;
};

export type RenderResponse =
  | { id: number; ok: true; pdf: Uint8Array; warnings: string[]; fingerprint: string }
  | { id: number; ok: false; error: string };

export type LoadedBundle = { bundle: RenderBundle; logo: Logo | null };

type BundleResponse = {
  ok?: boolean;
  bundle?: RenderBundle;
  logo?: { base64: string; mime: string } | null;
};

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Was das Bündel bestimmt; ändert sich nichts davon, gilt das alte weiter. */
export function bundleKey(draft: DraftBody): string {
  const { document, lines } = draft;
  const credited = [
    ...new Set(
      lines.flatMap((line) => (line.credited_document_id ? [line.credited_document_id] : [])),
    ),
  ]
    .map(String)
    .sort();
  return JSON.stringify([
    document.company_id,
    document.customer_id ?? null,
    document.parent_document_id ?? null,
    // Die Vorlage kommt mit dem Bündel; eine andere Auswahl braucht ein neues.
    document.invoice_template_id ?? null,
    credited,
  ]);
}

export async function loadBundle(draft: DraftBody): Promise<LoadedBundle> {
  const { data, error } = await supabase.functions.invoke<BundleResponse>(
    'finance-document-render',
    { body: { mode: 'preview', bundle_only: true, draft } },
  );
  if (error) throw error;
  if (!data?.ok || !data.bundle) throw new Error('BUNDLE_EMPTY');
  return {
    bundle: data.bundle,
    logo: data.logo ? { bytes: base64ToBytes(data.logo.base64), mime: data.logo.mime } : null,
  };
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (response: RenderResponse) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./documentRender.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<RenderResponse>) => {
    pending.get(event.data.id)?.(event.data);
    pending.delete(event.data.id);
  };
  worker.onerror = () => {
    // Ein abgestürzter Worker beantwortet nichts mehr: alle Wartenden
    // scheitern, der nächste Aufruf startet einen neuen.
    for (const [id, resolve] of pending) resolve({ id, ok: false, error: 'WORKER_CRASHED' });
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function clientRenderSupported(): boolean {
  return typeof Worker !== 'undefined';
}

export function renderInWorker(
  draft: DraftBody,
  loaded: LoadedBundle,
): Promise<{ pdf: Uint8Array; warnings: string[]; fingerprint: string }> {
  const id = ++nextId;
  const request: RenderRequest = { id, draft, bundle: loaded.bundle, logo: loaded.logo };
  return new Promise((resolve, reject) => {
    pending.set(id, (response) => {
      if (response.ok) {
        resolve({
          pdf: response.pdf,
          warnings: response.warnings,
          fingerprint: response.fingerprint,
        });
      } else {
        reject(new Error(response.error));
      }
    });
    getWorker().postMessage(request);
  });
}
