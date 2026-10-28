import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canDelete,
  canEditFields,
  type IncomingInvoiceFields,
  statusOptions,
  suggestGross,
  validateIncomingInvoice,
} from './incomingInvoiceForm.ts';

const complete: IncomingInvoiceFields = {
  vendorName: 'Baustoffhandel Muster',
  invoiceDate: '2026-10-01',
  dueDate: '2026-10-15',
  netMinor: 10_000,
  vatMinor: 1_900,
  grossMinor: 11_900,
};

const empty: IncomingInvoiceFields = {
  vendorName: '',
  invoiceDate: '',
  dueDate: '',
  netMinor: null,
  vatMinor: null,
  grossMinor: null,
};

describe('validateIncomingInvoice', () => {
  it('vollständig und stimmig: keine Fehler, in jedem Status', () => {
    for (const status of ['draft', 'open', 'paid', 'partially_paid', 'overdue'] as const) {
      assert.deepEqual(validateIncomingInvoice(complete, status), []);
    }
  });

  it('Entwurf darf leer sein', () => {
    assert.deepEqual(validateIncomingInvoice(empty, 'draft'), []);
  });

  it('ab „offen“ sind alle Pflichtfelder nötig, in Feldreihenfolge', () => {
    assert.deepEqual(validateIncomingInvoice({ ...empty, vendorName: '   ' }, 'open'), [
      'vendorRequired',
      'dateRequired',
      'dueRequired',
      'netRequired',
      'vatRequired',
      'grossRequired',
    ]);
  });

  it('Netto + USt muss Brutto auf den Cent ergeben, auch im Entwurf', () => {
    assert.deepEqual(validateIncomingInvoice({ ...complete, grossMinor: 11_901 }, 'open'), [
      'sumMismatch',
    ]);
    assert.deepEqual(
      validateIncomingInvoice({ ...empty, netMinor: 100, vatMinor: 19, grossMinor: 118 }, 'draft'),
      ['sumMismatch'],
    );
  });

  it('§13b: USt 0, Netto = Brutto ist stimmig', () => {
    assert.deepEqual(
      validateIncomingInvoice({ ...complete, vatMinor: 0, grossMinor: 10_000 }, 'open'),
      [],
    );
  });

  it('negative Beträge sind ein Fehler', () => {
    assert.ok(
      validateIncomingInvoice({ ...complete, netMinor: -100, grossMinor: 1_800 }, 'open').includes(
        'negativeAmount',
      ),
    );
  });

  it('Fälligkeit vor dem Rechnungsdatum ist ein Fehler, gleicher Tag nicht', () => {
    assert.deepEqual(validateIncomingInvoice({ ...complete, dueDate: '2026-09-30' }, 'open'), [
      'dueBeforeDate',
    ]);
    assert.deepEqual(validateIncomingInvoice({ ...complete, dueDate: '2026-10-01' }, 'open'), []);
  });
});

describe('suggestGross', () => {
  it('rechnet Brutto nur, wenn es fehlt', () => {
    assert.equal(suggestGross({ ...complete, grossMinor: null }), 11_900);
    assert.equal(suggestGross({ ...complete, grossMinor: 5 }), 5);
    assert.equal(suggestGross({ ...complete, grossMinor: null, vatMinor: null }), null);
  });
});

describe('Status, Bearbeiten, Löschen', () => {
  it('neu und Entwurf: alle Status, Felder offen, Entwurf löschbar', () => {
    assert.deepEqual(statusOptions(null), ['draft', 'open', 'partially_paid', 'paid', 'overdue']);
    assert.deepEqual(statusOptions('draft'), statusOptions(null));
    assert.equal(canEditFields(null), true);
    assert.equal(canEditFields('draft'), true);
    assert.equal(canDelete('draft'), true);
    assert.equal(canDelete(null), false);
  });

  it('erfasst: nie wieder Entwurf, Felder gesperrt, nicht löschbar', () => {
    for (const status of ['open', 'partially_paid', 'paid', 'overdue'] as const) {
      assert.ok(!statusOptions(status).includes('draft'));
      assert.equal(canEditFields(status), false);
      assert.equal(canDelete(status), false);
    }
  });
});
