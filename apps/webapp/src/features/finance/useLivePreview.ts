import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

import type { DraftRows } from './useDocumentEditor';

/** Tipp-Pause, nach der neu gerendert wird (Owner F2: ~800 ms). */
export const LIVE_PREVIEW_DELAY_MS = 800;

type PreviewResponse = {
  ok?: boolean;
  pdf_base64?: string;
  warnings?: string[];
};

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function invokePreview(body: object): Promise<{ pdf: Uint8Array; warnings: string[] }> {
  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    'finance-document-render',
    { body: { ...body, mode: 'preview' } },
  );
  if (error) throw error;
  if (!data?.ok || !data.pdf_base64) throw new Error('PREVIEW_EMPTY');
  return { pdf: base64ToBytes(data.pdf_base64), warnings: data.warnings ?? [] };
}

/**
 * Echtes PDF des gespeicherten Entwurfs aus `finance-document-render`
 * (`mode: 'preview'`, #150): dieselbe Pipeline wie beim Festschreiben, ohne
 * Ablage. Vorschau = Versand bis auf die Nummer.
 */
export function renderPreview(documentId: string) {
  return invokePreview({ document_id: documentId });
}

export type LivePreviewPhase = 'idle' | 'rendering';

/**
 * Live-Vorschau des Editors aus dem **ungespeicherten** Formular.
 *
 * Gespeichert wird nur auf ausdrücklichen Klick („Entwurf speichern“,
 * „Freigeben“; Owner 17.10.2026). Die Vorschau schickt deshalb Kopf und
 * Positionen so an die Render-Function, wie `useSaveDraft` sie speichern
 * würde (`buildDraftRows`) — das PDF ist dasselbe wie nach dem Speichern.
 *
 * Beim Öffnen kommt das PDF sofort, danach nach jeder Tipp-Pause. Antworten
 * eines überholten Laufs werden verworfen, damit nie ein älterer Stand den
 * neueren überschreibt.
 */
export function useLivePreview({
  rows,
  documentId,
  enabled,
}: {
  rows: DraftRows | null;
  /** Gespeicherter Entwurf, falls vorhanden; nur zur Zuordnung im Function-Log. */
  documentId: string | null;
  enabled: boolean;
}) {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [phase, setPhase] = useState<LivePreviewPhase>('idle');
  const [error, setError] = useState<unknown>(null);

  const latestRef = useRef<{ rows: DraftRows | null; documentId: string | null }>({
    rows,
    documentId,
  });
  const runRef = useRef(0);
  const renderedOnceRef = useRef(false);
  const json = rows ? JSON.stringify(rows) : null;

  useEffect(() => {
    latestRef.current = { rows, documentId };
  }, [rows, documentId]);

  const render = useCallback(async () => {
    const { rows: current, documentId: id } = latestRef.current;
    if (!current) return;
    const run = ++runRef.current;
    setPhase('rendering');
    try {
      const result = await invokePreview({
        draft: { document: { ...current.header, id }, lines: current.lines },
      });
      if (run !== runRef.current) return;
      renderedOnceRef.current = true;
      setPdf(result.pdf);
      setWarnings(result.warnings);
      setError(null);
    } catch (cause) {
      if (run !== runRef.current) return;
      setError(cause);
    } finally {
      if (run === runRef.current) setPhase('idle');
    }
  }, []);

  useEffect(() => {
    if (!enabled || json === null) return;
    const timer = window.setTimeout(
      () => void render(),
      renderedOnceRef.current ? LIVE_PREVIEW_DELAY_MS : 0,
    );
    return () => window.clearTimeout(timer);
  }, [json, enabled, render]);

  return {
    pdf,
    warnings,
    phase,
    error,
    /** Knopf „Vorschau aktualisieren“. */
    refresh: () => void render(),
  };
}
