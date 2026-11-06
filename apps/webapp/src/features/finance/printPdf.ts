/**
 * Welches PDF „Drucken“ auf der Belegseite an den Browser gibt.
 *
 * Festgeschrieben: das Archiv-Original, dieselben Bytes wie im Viewer.
 * Entwurf: die geladene PDF-Vorschau. `null`, wenn noch nichts da ist
 * (lädt, fehlt oder leer). Dann bleibt die HTML-Druckansicht.
 */
export function invoicePrintBytes(input: {
  isDraft: boolean;
  archivedPdf: Uint8Array | null;
  draftPdf: Uint8Array | null;
}): Uint8Array | null {
  const bytes = input.isDraft ? input.draftPdf : input.archivedPdf;
  if (!bytes || bytes.byteLength === 0) return null;
  return bytes;
}

/** Kurz warten, bis der PDF-Betrachter des Browsers `print()` annimmt. */
export const PDF_PRINT_DELAY_MS = 400;

/**
 * Blob-URL erst nach dem Dialog freigeben. Wer sie im `afterprint` sofort
 * widerruft, druckt in Chromium eine leere Seite.
 */
export const PDF_PRINT_RELEASE_MS = 1_000;

/** Obergrenze, falls `afterprint` ausbleibt (PDF-Plugin). */
export const PDF_PRINT_MAX_AGE_MS = 120_000;

export type PdfPrintWindow = {
  focus: () => void;
  print: () => void;
  addEventListener: (type: 'afterprint', listener: () => void) => void;
};

/**
 * Öffnet die Blob-URL. `onLoad` genau einmal, mit `null` wenn kein Fenster
 * erreichbar ist (Popup geblockt, Frame ohne `contentWindow`).
 */
export type PdfPrintHost = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  later: (fn: () => void, ms: number) => number;
  cancel: (id: number) => void;
  open: (url: string, onLoad: (win: PdfPrintWindow | null) => void) => { close: () => void };
};

export type PdfPrintOptions = {
  host?: PdfPrintHost;
  /** Versteckter Frame, nur für Hilfstechnik. */
  title?: string;
  onError?: (error: unknown) => void;
};

/**
 * Druckt PDF-Bytes, die schon im Speicher sind. Kein Download, kein neuer
 * Storage-Pfad: Blob-URL in einem versteckten iframe, dann `print()`.
 *
 * Der Frame liegt außerhalb des Sichtfelds, hat aber A4-Maß. `display: none`
 * oder 0×0 druckt in Chromium oft die leere Seite statt des PDFs.
 */
export function printPdfBytes(bytes: Uint8Array, options?: PdfPrintOptions): void {
  const onError = options?.onError;
  const fail = (error: unknown) => {
    if (onError) onError(error);
    else throw error;
  };

  if (bytes.byteLength === 0) {
    fail(new Error('EMPTY_PDF'));
    return;
  }

  const host = options?.host ?? browserPdfPrintHost(options?.title ?? '');
  let url: string;
  try {
    url = host.createObjectURL(new Blob([bytes.slice()], { type: 'application/pdf' }));
  } catch (error) {
    fail(error);
    return;
  }

  let closed = false;
  let maxAge = 0;
  // `open` kann `onLoad(null)` noch vor der Rückgabe rufen (Popup geblockt).
  let frame: { close: () => void } | null = null;
  const release = () => {
    if (closed) return;
    closed = true;
    host.cancel(maxAge);
    frame?.close();
    host.revokeObjectURL(url);
  };

  try {
    frame = host.open(url, (win) => {
      if (!win) {
        release();
        fail(new Error('PRINT_FRAME_MISSING'));
        return;
      }
      win.addEventListener('afterprint', () => {
        host.later(release, PDF_PRINT_RELEASE_MS);
      });
      host.later(() => {
        try {
          win.focus();
          win.print();
        } catch (error) {
          release();
          fail(error);
        }
      }, PDF_PRINT_DELAY_MS);
    });
    if (closed) frame.close();
    else maxAge = host.later(release, PDF_PRINT_MAX_AGE_MS);
  } catch (error) {
    if (!closed) {
      try {
        host.revokeObjectURL(url);
      } catch {
        // Die URL ist dann erst mit dem Dokument weg.
      }
    }
    fail(error);
  }
}

const PRINT_FRAME_ATTR = 'data-bautakt-print';

function browserPdfPrintHost(title: string): PdfPrintHost {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    later: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (id) => window.clearTimeout(id),
    open: (url, onLoad) => {
      document.querySelectorAll(`iframe[${PRINT_FRAME_ATTR}]`).forEach((node) => node.remove());
      const iframe = document.createElement('iframe');
      iframe.setAttribute(PRINT_FRAME_ATTR, '');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.title = title;
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.border = '0';
      let announced = false;
      const announce = () => {
        if (announced) return;
        announced = true;
        const win = iframe.contentWindow;
        onLoad(
          win
            ? {
                focus: () => win.focus(),
                print: () => win.print(),
                addEventListener: (type, listener) => win.addEventListener(type, listener),
              }
            : null,
        );
      };
      iframe.onload = announce;
      document.body.appendChild(iframe);
      iframe.src = url;
      return { close: () => iframe.remove() };
    },
  };
}
