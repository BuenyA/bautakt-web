import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

import type { DraftRows } from './useDocumentEditor';

/** Tipp-Pause, nach der neu gerendert wird (Owner F2: ~800 ms). */
export const LIVE_PREVIEW_DELAY_MS = 800;

type PreviewResponse = {
  ok?: boolean;
  pdf_base64?: string;
  warnings?: string[];
  /** Fingerabdruck der Render-Eingabe ohne Nummer (#217). */
  fingerprint?: string;
};

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export type PreviewResult = { pdf: Uint8Array; warnings: string[]; fingerprint: string | null };

async function invokePreview(body: object): Promise<PreviewResult> {
  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    'finance-document-render',
    { body: { ...body, mode: 'preview' } },
  );
  if (error) throw error;
  if (!data?.ok || !data.pdf_base64) throw new Error('PREVIEW_EMPTY');
  return {
    pdf: base64ToBytes(data.pdf_base64),
    warnings: data.warnings ?? [],
    fingerprint: data.fingerprint ?? null,
  };
}

/**
 * Echtes PDF des gespeicherten Entwurfs aus `finance-document-render`
 * (`mode: 'preview'`, #150): dieselbe Pipeline wie beim Festschreiben, ohne
 * Ablage. Vorschau = Versand bis auf die Nummer.
 */
export function renderPreview(documentId: string) {
  return invokePreview({ document_id: documentId });
}

/**
 * Nur der Fingerabdruck des gespeicherten Belegs, ohne PDF (#217). Damit
 * prüft die Freigabe, dass der gespeicherte Stand der angezeigten Vorschau
 * entspricht, bevor er festgeschrieben wird.
 */
export async function fetchFingerprint(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    'finance-document-render',
    { body: { document_id: documentId, mode: 'preview', fingerprint_only: true } },
  );
  if (error) throw error;
  if (!data?.ok || !data.fingerprint) throw new Error('FINGERPRINT_EMPTY');
  return data.fingerprint;
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
 *
 * `current` sagt, ob das angezeigte PDF genau zum Formular passt (kein
 * ausstehender Render, kein Fehler). Nur dann darf freigegeben werden, und
 * `fingerprint` ist der Stand, den der Nutzer gesehen hat (#217).
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
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  // Formularstand, aus dem das angezeigte PDF stammt.
  const [renderedJson, setRenderedJson] = useState<string | null>(null);
  const renderedJsonRef = useRef<string | null>(null);

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

  /**
   * Ohne Argument aus dem Formular; mit `savedId` der gespeicherte Beleg.
   * Den zeigt die Freigabe, wenn er von der Vorschau abweicht (#217) — er
   * gilt dann als Vorschau zum aktuellen Formular, denn genau er wird
   * festgeschrieben.
   */
  const render = useCallback(async (savedId?: string) => {
    const { rows: current, documentId: id } = latestRef.current;
    if (!current) return;
    const run = ++runRef.current;
    const source = JSON.stringify(current);
    setPhase('rendering');
    try {
      const result = await invokePreview(
        savedId
          ? { document_id: savedId }
          : { draft: { document: { ...current.header, id }, lines: current.lines } },
      );
      if (run !== runRef.current) return;
      renderedOnceRef.current = true;
      renderedJsonRef.current = source;
      setRenderedJson(source);
      setPdf(result.pdf);
      setWarnings(result.warnings);
      setFingerprint(result.fingerprint);
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
      () => {
        // `flush` kann denselben Stand schon gerendert haben.
        if (renderedJsonRef.current !== json) void render();
      },
      renderedOnceRef.current ? LIVE_PREVIEW_DELAY_MS : 0,
    );
    return () => window.clearTimeout(timer);
  }, [json, enabled, render]);

  const current =
    phase === 'idle' && error === null && pdf !== null && json !== null && renderedJson === json;

  return {
    pdf,
    warnings,
    phase,
    error,
    current,
    fingerprint: current ? fingerprint : null,
    /** Knopf „Vorschau aktualisieren“. */
    refresh: () => void render(),
    /**
     * Sofort rendern, wenn das PDF nicht zum Formular passt (vor dem
     * Freigeben). Nach einem Fehler nicht von selbst erneut, dafür gibt es
     * `refresh`.
     */
    flush: () => {
      if (!current && phase === 'idle' && error === null) void render();
    },
    /** Gespeicherten Beleg als Vorschau zeigen. */
    showSaved: (savedId: string) => render(savedId),
  };
}
