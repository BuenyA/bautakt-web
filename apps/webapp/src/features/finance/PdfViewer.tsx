import {
  Spinner,
  Text,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
} from '@fluentui/react-components';
import { ZoomFitRegular, ZoomInRegular, ZoomOutRegular } from '@fluentui/react-icons';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
/** Abstand der Seiten zum Rand und untereinander, in CSS-Pixeln. */
const PAGE_GAP = 16;

type Zoom = 'fit' | number;

/**
 * Zeigt ein echtes PDF als Bild, Seite für Seite (pdf.js auf Canvas).
 *
 * Bewusst kein `<iframe>` mit dem Browser-Viewer: der lädt bei jeder neuen
 * Vorschau sichtbar neu, springt an den Seitenanfang und bringt seine eigene
 * Leiste mit. Hier bleibt die alte Fassung stehen, bis die neue fertig
 * gezeichnet ist, und erst dann werden die Seiten getauscht — kein Flackern,
 * kein Layout-Sprung. Text lässt sich im Bild nicht bearbeiten (Leitplanke
 * L2): geändert wird nur über das Formular.
 *
 * pdf.js kommt per dynamischem Import und nur hier; das Hauptbundle bleibt
 * ohne.
 */
export function PdfViewer({
  data,
  loading,
  error,
  emptyText,
  toolbarEnd,
}: {
  data: Uint8Array | null;
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  toolbarEnd?: ReactNode;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [hasPages, setHasPages] = useState(false);
  // Maßstab, den „Breite“ gerade ergibt — Startpunkt für Vergrößern/Verkleinern.
  const [fitScale, setFitScale] = useState(1);

  // Breite für „an Breite anpassen“ — folgt dem Fenster und dem Seitenumbruch.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = pagesRef.current;
    if (!data || !target || width === 0) return;
    let cancelled = false;

    async function render() {
      setRendering(true);
      setRenderError(null);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        // getDocument übernimmt den Puffer; eine Kopie hält `data` gültig.
        const task = pdfjs.getDocument({ data: data!.slice() });
        const pdf = await task.promise;
        const ratio = window.devicePixelRatio || 1;
        const canvases: HTMLCanvasElement[] = [];
        let firstScale = 1;

        for (let number = 1; number <= pdf.numPages; number += 1) {
          const page = await pdf.getPage(number);
          const base = page.getViewport({ scale: 1 });
          const cssScale = zoom === 'fit' ? (width - PAGE_GAP * 2) / base.width : zoom;
          if (number === 1) firstScale = cssScale;
          const viewport = page.getViewport({ scale: cssScale * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(base.width * cssScale)}px`;
          canvas.style.height = `${Math.floor(base.height * cssScale)}px`;
          canvas.className = 'block shadow-md';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute(
            'aria-label',
            t('domain:pdfViewer.pageLabel', { page: number, count: pdf.numPages }),
          );
          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          canvases.push(canvas);
        }
        await task.destroy();
        if (cancelled) return;
        // Erst jetzt tauschen: bis hierhin war die alte Fassung zu sehen.
        target!.replaceChildren(...canvases);
        setHasPages(canvases.length > 0);
        if (zoom === 'fit') setFitScale(firstScale);
      } catch (cause) {
        if (!cancelled) setRenderError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [data, zoom, width, t]);

  const current = zoom === 'fit' ? fitScale : zoom;
  const canZoomOut = ZOOM_STEPS.some((step) => step < current - 0.01);
  const canZoomIn = ZOOM_STEPS.some((step) => step > current + 0.01);
  const busy = loading || rendering;
  const shownError = error ?? (renderError ? t('domain:pdfViewer.renderError') : null);

  // Nächste Stufe über bzw. unter der aktuellen Größe, auch von „Breite“ aus.
  function zoomBy(direction: 1 | -1) {
    const next =
      direction > 0
        ? ZOOM_STEPS.find((step) => step > current + 0.01)
        : [...ZOOM_STEPS].reverse().find((step) => step < current - 0.01);
    if (next) setZoom(next);
  }

  return (
    <div className="border-border flex h-full min-h-0 flex-col overflow-hidden rounded-lg border">
      <div className="border-border bg-background flex items-center justify-between gap-2 border-b px-2">
        <Toolbar size="small" aria-label={t('domain:pdfViewer.toolbar')}>
          <Tooltip content={t('domain:pdfViewer.zoomOut')} relationship="label">
            <ToolbarButton
              icon={<ZoomOutRegular />}
              disabled={!canZoomOut}
              onClick={() => zoomBy(-1)}
            />
          </Tooltip>
          <Text size={200} className="w-12 text-center tabular-nums">
            {zoom === 'fit' ? t('domain:pdfViewer.fit') : `${Math.round(zoom * 100)} %`}
          </Text>
          <Tooltip content={t('domain:pdfViewer.zoomIn')} relationship="label">
            <ToolbarButton
              icon={<ZoomInRegular />}
              disabled={!canZoomIn}
              onClick={() => zoomBy(1)}
            />
          </Tooltip>
          <ToolbarDivider />
          <Tooltip content={t('domain:pdfViewer.fitWidth')} relationship="label">
            <ToolbarButton
              icon={<ZoomFitRegular />}
              disabled={zoom === 'fit'}
              onClick={() => setZoom('fit')}
            />
          </Tooltip>
        </Toolbar>
        <div className="flex items-center gap-2">
          {busy ? <Spinner size="extra-tiny" label={t('domain:pdfViewer.updating')} /> : null}
          {toolbarEnd}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="bg-muted relative min-h-0 flex-1 overflow-auto"
        // Platz für die Bildlaufleiste fest reservieren: sonst ändert ihr
        // Erscheinen die Breite, und „Breite“ rendert im Kreis.
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          ref={pagesRef}
          className="flex w-max min-w-full flex-col items-center"
          style={{ gap: PAGE_GAP, padding: PAGE_GAP }}
        />
        {!hasPages ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {/* Platzhalter im Seitenformat, damit nichts springt, wenn das PDF kommt. */}
            <div className="bg-background flex aspect-[1/1.414] w-full max-w-md items-center justify-center rounded shadow-md">
              {busy && !shownError ? (
                <Spinner label={t('domain:pdfViewer.loading')} />
              ) : (
                <Text className="text-muted-foreground px-6 text-center">
                  {shownError ?? emptyText ?? t('domain:pdfViewer.empty')}
                </Text>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {shownError && hasPages ? (
        <div className="border-border text-destructive border-t px-3 py-2 text-sm" role="alert">
          {shownError}
        </div>
      ) : null}
    </div>
  );
}
