import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

import type { EditorState } from './useDocumentEditor';

/** Tipp-Pause, nach der gespeichert und neu gerendert wird (Owner F2: ~800 ms). */
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

/**
 * Echtes PDF des gespeicherten Entwurfs aus `finance-document-render`
 * (`mode: 'preview'`, #150): dieselbe Pipeline wie beim Festschreiben, ohne
 * Ablage. Vorschau = Versand bis auf Nummer und Entwurfs-Wasserzeichen.
 */
export async function renderPreview(
  documentId: string,
): Promise<{ pdf: Uint8Array; warnings: string[] }> {
  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    'finance-document-render',
    { body: { document_id: documentId, mode: 'preview' } },
  );
  if (error) throw error;
  if (!data?.ok || !data.pdf_base64) throw new Error('PREVIEW_EMPTY');
  return { pdf: base64ToBytes(data.pdf_base64), warnings: data.warnings ?? [] };
}

export type LivePreviewPhase = 'idle' | 'saving' | 'rendering';

/**
 * Live-Vorschau des Editors: Formular speichern, dann das PDF rendern.
 *
 * Die Render-Function liest den Beleg aus der Datenbank, nicht aus dem
 * Formular — nur so ist die Vorschau dasselbe PDF, das beim Festschreiben
 * entsteht. Deshalb speichert der Editor einen Entwurf nach jeder Tipp-Pause
 * und beim Verlassen eines Felds (`flush`); Entwürfe sind frei änderbar.
 *
 * ⚠️ Alle Speicherläufe laufen nacheinander über eine Kette, auch der Klick
 * auf „Speichern“. Zwei gleichzeitige Läufe würden beide die Positionen
 * löschen und neu einfügen — danach stünden sie doppelt im Beleg.
 *
 * Ein neuer Beleg wird beim Öffnen sofort als Entwurf gespeichert, damit die
 * Vorschau gleich ein PDF zeigt. Bleibt er unverändert, löscht `discard` ihn
 * beim Verlassen des Editors wieder — bloßes Öffnen hinterlässt keinen
 * leeren Entwurf.
 */
export function useLivePreview({
  state,
  initialDocumentId,
  save,
  discard,
  enabled,
}: {
  state: EditorState | null;
  initialDocumentId: string | null;
  save: (state: EditorState, documentId: string | null) => Promise<string>;
  /** Löscht einen beim Öffnen angelegten, nie geänderten Entwurf. */
  discard: (documentId: string) => Promise<void>;
  enabled: boolean;
}) {
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId);
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [phase, setPhase] = useState<LivePreviewPhase>('idle');
  const [error, setError] = useState<unknown>(null);

  const documentIdRef = useRef<string | null>(initialDocumentId);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const savedJsonRef = useRef<string | null>(null);
  const baselineJsonRef = useRef<string | null>(null);
  const latestStateRef = useRef<EditorState | null>(state);
  const timerRef = useRef<number | null>(null);
  // Beim Öffnen angelegt und seitdem weder geändert noch ausdrücklich gespeichert.
  const untouchedRef = useRef(false);
  const discardRef = useRef(discard);
  useEffect(() => {
    discardRef.current = discard;
  }, [discard]);

  // Vor allen anderen Effekten: Der Zeitgeber unten liest beides erst später.
  useEffect(() => {
    latestStateRef.current = state;
    // Erster Zustand gilt als „unverändert“: beim Bearbeiten ist er
    // gespeichert, beim neuen Beleg soll er nicht als leerer Entwurf landen.
    if (state && baselineJsonRef.current === null) {
      baselineJsonRef.current = JSON.stringify(state);
      if (initialDocumentId) savedJsonRef.current = baselineJsonRef.current;
    }
  }, [state, initialDocumentId]);

  /** Speichert, wenn nötig, und gibt die Beleg-Id zurück. Läuft in der Kette. */
  const persist = useCallback(
    (force = false): Promise<string | null> => {
      const run = chainRef.current.then(async () => {
        const current = latestStateRef.current;
        if (!current) return documentIdRef.current;
        const json = JSON.stringify(current);
        const unchanged =
          json === savedJsonRef.current ||
          (!documentIdRef.current && json === baselineJsonRef.current);
        // `force` legt einen neuen Beleg auch ohne Änderung an (Knopf
        // „Speichern“ oder „Vorschau aktualisieren“).
        const needsSave = !unchanged || (force && !documentIdRef.current);
        if (!needsSave) return documentIdRef.current;
        setPhase('saving');
        const created = !documentIdRef.current;
        const id = await save(current, documentIdRef.current);
        untouchedRef.current = created && json === baselineJsonRef.current;
        documentIdRef.current = id;
        savedJsonRef.current = json;
        setDocumentId(id);
        return id;
      });
      // Ein Fehler darf die Kette nicht für alle folgenden Läufe blockieren.
      chainRef.current = run.catch(() => undefined);
      return run;
    },
    [save],
  );

  const renderedJsonRef = useRef<string | null>(null);

  const update = useCallback(
    async (force = false) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      try {
        const id = await persist(force);
        if (!id) {
          setPhase('idle');
          return;
        }
        // Nichts Neues gespeichert und schon gerendert: kein zweiter Aufruf.
        if (!force && renderedJsonRef.current === savedJsonRef.current) {
          setPhase('idle');
          return;
        }
        const renderedFor = savedJsonRef.current;
        setPhase('rendering');
        const result = await renderPreview(id);
        // Während des Renderns weitergetippt: das Ergebnis trotzdem zeigen,
        // der nächste Lauf ersetzt es gleich.
        renderedJsonRef.current = renderedFor;
        setPdf(result.pdf);
        setWarnings(result.warnings);
        setError(null);
      } catch (cause) {
        setError(cause);
      } finally {
        setPhase('idle');
      }
    },
    [persist],
  );

  // Entprellt nach jeder Änderung. Beim Öffnen kommt das PDF sofort, ohne die
  // Pause abzuwarten; ein neuer Beleg wird dafür gleich angelegt.
  useEffect(() => {
    if (!enabled || !state) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const firstOpen = renderedJsonRef.current === null;
    const createNow = firstOpen && !documentIdRef.current;
    timerRef.current = window.setTimeout(
      () => void update(createNow),
      firstOpen ? 0 : LIVE_PREVIEW_DELAY_MS,
    );
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [state, enabled, update]);

  // Editor verlassen, ohne etwas einzutragen: den leeren Entwurf wieder löschen.
  // Erst nach allen laufenden Speicherläufen, sonst fehlt die Id noch.
  useEffect(
    () => () => {
      void chainRef.current.then(() => {
        const id = documentIdRef.current;
        if (id && untouchedRef.current) {
          untouchedRef.current = false;
          void discardRef.current(id).catch(() => undefined);
        }
      });
    },
    [],
  );

  return {
    documentId,
    pdf,
    warnings,
    phase,
    error,
    /** Sofort speichern und rendern, z. B. beim Verlassen eines Felds. */
    flush: () => void update(),
    /** Knopf „Vorschau aktualisieren“: rendert auch ohne Änderung neu. */
    refresh: () => void update(true),
    /** Für „Speichern“: wartet auf alle laufenden Läufe und speichert den Stand. */
    persist: async () => {
      const id = await persist(true);
      untouchedRef.current = false;
      return id;
    },
  };
}
