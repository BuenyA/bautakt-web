import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  invoicePrintBytes,
  PDF_PRINT_DELAY_MS,
  PDF_PRINT_MAX_AGE_MS,
  PDF_PRINT_RELEASE_MS,
  type PdfPrintHost,
  type PdfPrintWindow,
  printPdfBytes,
} from './printPdf.ts';

const ARCHIVE = new Uint8Array([1, 2, 3]);
const DRAFT = new Uint8Array([9, 9]);

describe('invoicePrintBytes', () => {
  it('festgeschrieben: das Archiv, nicht die Vorschau', () => {
    const bytes = invoicePrintBytes({ isDraft: false, archivedPdf: ARCHIVE, draftPdf: DRAFT });
    assert.equal(bytes, ARCHIVE);
  });

  it('Entwurf: die Vorschau, nicht ein zufälliges Archiv', () => {
    const bytes = invoicePrintBytes({ isDraft: true, archivedPdf: ARCHIVE, draftPdf: DRAFT });
    assert.equal(bytes, DRAFT);
  });

  it('leer oder fehlend: kein PDF, die HTML-Ansicht bleibt', () => {
    assert.equal(invoicePrintBytes({ isDraft: false, archivedPdf: null, draftPdf: DRAFT }), null);
    assert.equal(invoicePrintBytes({ isDraft: true, archivedPdf: ARCHIVE, draftPdf: null }), null);
    assert.equal(
      invoicePrintBytes({
        isDraft: false,
        archivedPdf: new Uint8Array(),
        draftPdf: null,
      }),
      null,
    );
  });
});

describe('printPdfBytes', () => {
  it('druckt den Blob, ohne die URL vor dem Dialog freizugeben', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const timers: { fn: () => void; ms: number; id: number }[] = [];
    let nextId = 1;
    const cancelled: number[] = [];
    const captured: { blob: Blob | null } = { blob: null };
    let opened: string | null = null;
    let loaded: ((win: PdfPrintWindow | null) => void) | null = null;
    let closed = false;
    let revoked = false;
    const printed: string[] = [];
    const listeners: Partial<Record<'afterprint', () => void>> = {};

    const host: PdfPrintHost = {
      createObjectURL: (value) => {
        captured.blob = value;
        return 'blob:beleg';
      },
      revokeObjectURL: (url) => {
        assert.equal(url, 'blob:beleg');
        revoked = true;
      },
      later: (fn, ms) => {
        const id = nextId;
        nextId += 1;
        timers.push({ fn, ms, id });
        return id;
      },
      cancel: (id) => {
        cancelled.push(id);
      },
      open: (url, onLoad) => {
        opened = url;
        loaded = onLoad;
        return {
          close: () => {
            closed = true;
          },
        };
      },
    };

    printPdfBytes(bytes, { host });

    const pdf = captured.blob;
    assert.ok(pdf);
    assert.equal(opened, 'blob:beleg');
    assert.equal(pdf.type, 'application/pdf');
    assert.deepEqual(new Uint8Array(await pdf.arrayBuffer()), bytes);
    assert.equal(revoked, false);
    assert.equal(
      timers.some((timer) => timer.ms === PDF_PRINT_MAX_AGE_MS),
      true,
    );

    loaded!({
      focus: () => printed.push('focus'),
      print: () => printed.push('print'),
      addEventListener: (type, listener) => {
        listeners[type] = listener;
      },
    });

    assert.deepEqual(printed, []);
    const printTimer = timers.find((timer) => timer.ms === PDF_PRINT_DELAY_MS);
    assert.ok(printTimer);
    printTimer.fn();
    assert.deepEqual(printed, ['focus', 'print']);
    assert.equal(revoked, false);
    assert.equal(closed, false);

    assert.ok(listeners.afterprint);
    listeners.afterprint();
    const release = timers.find((timer) => timer.ms === PDF_PRINT_RELEASE_MS);
    assert.ok(release);
    release.fn();
    assert.equal(revoked, true);
    assert.equal(closed, true);
    assert.ok(cancelled.length > 0);
  });

  it('ohne Fenster: Fehler, URL weg', () => {
    const errors: unknown[] = [];
    let revoked = false;
    let closed = false;
    printPdfBytes(new Uint8Array([1]), {
      onError: (error) => errors.push(error),
      host: {
        createObjectURL: () => 'blob:fehl',
        revokeObjectURL: () => {
          revoked = true;
        },
        later: () => 1,
        cancel: () => {},
        open: (_url, onLoad) => {
          onLoad(null);
          return {
            close: () => {
              closed = true;
            },
          };
        },
      },
    });
    assert.equal(errors.length, 1);
    assert.equal(revoked, true);
    assert.equal(closed, true);
  });

  it('leeres PDF druckt nicht', () => {
    assert.throws(() => printPdfBytes(new Uint8Array()), /EMPTY_PDF/);
  });
});
