import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySuggestion,
  type InvoiceSuggestion,
  parseOutcome,
  storedFile,
  storeErrorKey,
  type SuggestibleValues,
  uploadKind,
} from './incomingInvoiceUpload.ts';

const HASH = 'a'.repeat(64);

describe('uploadKind', () => {
  it('erkennt PDF, XML und Fotos an Typ oder Endung', () => {
    assert.equal(uploadKind('rechnung.pdf', 'application/pdf'), 'pdf');
    assert.equal(uploadKind('RECHNUNG.PDF', ''), 'pdf');
    assert.equal(uploadKind('xrechnung.xml', 'text/xml'), 'xml');
    assert.equal(uploadKind('beleg', 'application/xml'), 'xml');
    assert.equal(uploadKind('foto.jpeg', 'image/jpeg'), 'image');
    assert.equal(uploadKind('foto.webp', ''), 'image');
  });

  it('lehnt anderes ab', () => {
    assert.equal(uploadKind('archiv.zip', 'application/zip'), null);
    assert.equal(uploadKind('foto.heic', 'image/heic'), null);
    assert.equal(uploadKind('ohne-endung', ''), null);
  });
});

describe('Antwort von finance-inbound-store', () => {
  it('Erfolg nur mit Pfad und SHA-256', () => {
    const body = {
      ok: true,
      id: 'id-1',
      storage_path: 'c/incoming/id-1.pdf',
      content_hash: HASH,
      mime_type: 'application/pdf',
    };
    assert.deepEqual(storedFile(body), {
      id: 'id-1',
      storagePath: 'c/incoming/id-1.pdf',
      mimeType: 'application/pdf',
    });
    assert.equal(storedFile({ ...body, content_hash: 'kurz' }), null);
    assert.equal(storedFile({ ...body, storage_path: '' }), null);
    assert.equal(storedFile({ ...body, ok: false }), null);
    assert.equal(storedFile(null), null);
  });

  it('Fehler auf Schlüssel abbilden', () => {
    assert.equal(storeErrorKey(403, { error: 'forbidden' }), 'forbidden');
    assert.equal(storeErrorKey(413, {}), 'tooLarge');
    assert.equal(storeErrorKey(415, {}), 'unsupported');
    assert.equal(storeErrorKey(409, { error: 'file_exists' }), 'fileExists');
    assert.equal(storeErrorKey(409, { error: 'not_draft' }), 'notDraft');
    assert.equal(storeErrorKey(400, { error: 'invalid_request' }), 'invalid');
    assert.equal(storeErrorKey(500, null), 'unknown');
  });
});

const parsed = {
  extracted: true,
  vendorName: ' Baustoffhandel Muster GmbH ',
  vendorVatId: 'DE123456789',
  invoiceNumber: 'R-2026-17',
  invoiceDate: '2026-10-01',
  dueDate: '2026-10-31',
  netTotal: 100,
  vatTotal: 19,
  grossTotal: 119,
  currency: 'EUR',
  sourceFormat: 'zugferd',
  parsedPayload: { foundFields: ['BT-1', 'BT-2', 'BT-27', 'BT-112'] },
};

describe('parseOutcome', () => {
  it('übernimmt die Kernfelder, Beträge in Cent', () => {
    assert.deepEqual(parseOutcome(parsed), {
      status: 'suggested',
      foreignCurrency: null,
      suggestion: {
        sourceFormat: 'zugferd',
        vendorName: 'Baustoffhandel Muster GmbH',
        vendorVatId: 'DE123456789',
        invoiceNumber: 'R-2026-17',
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-31',
        netMinor: 10_000,
        vatMinor: 1_900,
        grossMinor: 11_900,
      },
    });
  });

  it('Cent ohne Rundungsfehler', () => {
    const outcome = parseOutcome({ ...parsed, netTotal: 0.1 + 0.2, vatTotal: 1234.56 });
    assert.equal(outcome.status, 'suggested');
    if (outcome.status !== 'suggested') return;
    assert.equal(outcome.suggestion.netMinor, 30);
    assert.equal(outcome.suggestion.vatMinor, 123_456);
  });

  it('nichts, wenn die Function nichts Belastbares gelesen hat', () => {
    assert.deepEqual(parseOutcome({ ...parsed, extracted: false }), { status: 'none' });
    assert.deepEqual(parseOutcome({ ...parsed, sourceFormat: 'manual' }), { status: 'none' });
    assert.deepEqual(parseOutcome('kaputt'), { status: 'none' });
  });

  it('Rechnungsdatum nur, wenn BT-2 im Dokument stand', () => {
    const outcome = parseOutcome({ ...parsed, parsedPayload: { foundFields: ['BT-1'] } });
    assert.ok(outcome.status === 'suggested' && outcome.suggestion.invoiceDate === undefined);
  });

  it('fremde Währung: keine Beträge, Hinweis mit Währung', () => {
    const outcome = parseOutcome({ ...parsed, currency: 'chf' });
    assert.equal(outcome.status, 'suggested');
    if (outcome.status !== 'suggested') return;
    assert.equal(outcome.foreignCurrency, 'CHF');
    assert.equal(outcome.suggestion.grossMinor, undefined);
    assert.equal(outcome.suggestion.vendorName, 'Baustoffhandel Muster GmbH');
  });
});

describe('applySuggestion', () => {
  const today = '2026-10-28';
  const empty: SuggestibleValues = {
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: today,
    dueDate: '',
    net: '',
    vat: '',
    gross: '',
  };
  const suggestion: InvoiceSuggestion = {
    sourceFormat: 'xrechnung',
    vendorName: 'Muster',
    invoiceNumber: 'R-1',
    invoiceDate: '2026-10-01',
    dueDate: '2026-10-31',
    netMinor: 10_000,
    vatMinor: 1_900,
    grossMinor: 11_900,
  };
  const format = (minor: number) => (minor / 100).toFixed(2).replace('.', ',');

  it('füllt leere Felder und die Datums-Vorbelegung, alle markiert', () => {
    const { values, filled } = applySuggestion(empty, suggestion, today, format);
    assert.deepEqual(values, {
      vendorName: 'Muster',
      invoiceNumber: 'R-1',
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-31',
      net: '100,00',
      vat: '19,00',
      gross: '119,00',
    });
    assert.deepEqual(filled, [
      'vendorName',
      'invoiceNumber',
      'invoiceDate',
      'dueDate',
      'net',
      'vat',
      'gross',
    ]);
  });

  it('überschreibt nichts, was schon eingetragen ist', () => {
    const typed = { ...empty, vendorName: 'Eigener Name', invoiceDate: '2026-09-15', net: '5' };
    const { values, filled } = applySuggestion(typed, suggestion, today, format);
    assert.equal(values.vendorName, 'Eigener Name');
    assert.equal(values.invoiceDate, '2026-09-15');
    assert.equal(values.net, '5');
    assert.ok(!filled.includes('vendorName') && !filled.includes('net'));
    assert.ok(filled.includes('gross'));
  });

  it('ohne Vorschlag für ein Feld bleibt es leer und unmarkiert', () => {
    const { filled } = applySuggestion(empty, { sourceFormat: 'zugferd' }, today, format);
    assert.deepEqual(filled, []);
  });
});
