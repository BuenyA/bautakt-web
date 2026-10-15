/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  changedFields,
  emptyContact,
  hasOptionalValues,
  withoutRole,
  withRole,
} from './contactDraft.ts';
import {
  contactTabFromSearch,
  contactTabToSearch,
  matchesContactTab,
} from './contactListFilter.ts';
import {
  activeRoles,
  constructionWithholdingCents,
  contactDisplayName,
  exemptionState,
  formatContactAddress,
  formatIban,
  isValidIban,
} from './contactModel.ts';

describe('contactDisplayName', () => {
  it('Firma: Firmenname, nicht der Ansprechpartner', () => {
    assert.equal(
      contactDisplayName({
        kind: 'company',
        company_name: 'Müller Bau GmbH',
        first_name: 'Eva',
        last_name: 'Müller',
      }),
      'Müller Bau GmbH',
    );
  });
  it('Person: Vor- und Nachname, ein liegengebliebener Firmenname zählt nicht', () => {
    assert.equal(
      contactDisplayName({
        kind: 'person',
        company_name: 'Alt',
        first_name: ' Anna ',
        last_name: 'Schneider',
      }),
      'Anna Schneider',
    );
  });
});

describe('activeRoles', () => {
  it('Subunternehmer ersetzt in der Anzeige den Lieferanten', () => {
    assert.deepEqual(
      activeRoles({
        customer: { archived_at: null },
        supplier: { archived_at: null, subcontractor: { archived_at: null } },
        other: null,
      }),
      ['customer', 'subcontractor'],
    );
  });
  it('archivierte Rollen zählen nicht; archivierter Subunternehmer bleibt Lieferant', () => {
    assert.deepEqual(
      activeRoles({
        customer: { archived_at: '2026-10-01T00:00:00Z' },
        supplier: { archived_at: null, subcontractor: { archived_at: '2026-10-01T00:00:00Z' } },
        other: null,
      }),
      ['supplier'],
    );
  });
});

describe('Reiter der Kontaktliste', () => {
  it('URL-Werte sind deutsch, unbekannt heißt Alle', () => {
    assert.equal(contactTabFromSearch('lieferanten'), 'suppliers');
    assert.equal(contactTabFromSearch('quatsch'), 'all');
    assert.equal(contactTabToSearch('subcontractors'), 'subunternehmer');
    assert.equal(contactTabToSearch('all'), null);
  });
  it('ein Kontakt mit zwei Rollen steht in beiden Reitern', () => {
    const row = { archived_at: null, roles: ['customer', 'subcontractor'] as const };
    assert.equal(matchesContactTab({ ...row, roles: [...row.roles] }, 'customers', false), true);
    assert.equal(
      matchesContactTab({ ...row, roles: [...row.roles] }, 'subcontractors', false),
      true,
    );
    assert.equal(matchesContactTab({ ...row, roles: [...row.roles] }, 'suppliers', false), false);
  });
  it('archivierte nur mit dem Schalter, dann nur sie', () => {
    const archived = { archived_at: '2026-10-01', roles: [] };
    const active = { archived_at: null, roles: ['customer' as const] };
    assert.equal(matchesContactTab(archived, 'all', false), false);
    assert.equal(matchesContactTab(archived, 'all', true), true);
    assert.equal(matchesContactTab(active, 'all', true), false);
  });
});

describe('Rollen im Formular', () => {
  it('Subunternehmer bringt den Lieferanten mit', () => {
    assert.deepEqual(withRole([], 'subcontractor').sort(), ['subcontractor', 'supplier']);
  });
  it('ohne Lieferant kein Subunternehmer', () => {
    assert.deepEqual(withoutRole(['customer', 'supplier', 'subcontractor'], 'supplier'), [
      'customer',
    ]);
  });
  it('neuer Kontakt mit Rolle aus dem Reiter, Land Deutschland', () => {
    const draft = emptyContact('customer');
    assert.deepEqual(draft.roles, ['customer']);
    assert.equal(draft.country, 'DE');
  });
});

describe('changedFields', () => {
  it('nur geänderte Felder — ein Teil-Update überschreibt nichts Fremdes', () => {
    assert.deepEqual(
      changedFields(
        { city: 'Köln', phone: '1', payment_term_days: 14 as number | null },
        { city: 'Köln', phone: '2', payment_term_days: null },
      ),
      { phone: '2', payment_term_days: null },
    );
  });
});

describe('§48b-Freistellung', () => {
  const certs = [{ valid_from: '2026-01-01', valid_until: '2026-10-31' }];
  it('gültig, läuft ab (30 Tage), abgelaufen, fehlt', () => {
    assert.equal(exemptionState(certs, '2026-06-01'), 'valid');
    assert.equal(exemptionState(certs, '2026-10-14'), 'expiring');
    assert.equal(exemptionState(certs, '2026-11-01'), 'expired');
    assert.equal(exemptionState([], '2026-06-01'), 'missing');
  });
  it('eine Erneuerung zählt ab ihrem Beginn', () => {
    const renewed = [...certs, { valid_from: '2026-10-15', valid_until: '2029-10-14' }];
    assert.equal(exemptionState(renewed, '2026-10-20'), 'valid');
  });
  it('Einbehalt 15 % vom Brutto, kaufmännisch gerundet', () => {
    assert.equal(constructionWithholdingCents(119_00), 17_85);
    assert.equal(constructionWithholdingCents(333), 50);
  });
});

describe('IBAN', () => {
  it('Prüfziffer', () => {
    assert.equal(isValidIban('DE02 1203 0000 0000 2020 51'), true);
    assert.equal(isValidIban('DE02120300000000202052'), false);
    assert.equal(isValidIban('AT611904300234573201'), true);
  });
  it('Vierergruppen', () => {
    assert.equal(formatIban('de02120300000000202051'), 'DE02 1203 0000 0000 2020 51');
  });
});

describe('formatContactAddress', () => {
  it('Deutschland ohne Länderzeile, Ausland mit', () => {
    assert.equal(
      formatContactAddress({
        street: 'Hauptstr. 1',
        postalCode: '50667',
        city: 'Köln',
        country: 'DE',
      }),
      'Hauptstr. 1\n50667 Köln',
    );
    assert.equal(
      formatContactAddress({
        street: 'Werkweg 5',
        postalCode: '1010',
        city: 'Wien',
        country: 'AT',
      }),
      'Werkweg 5\n1010 Wien\nAT',
    );
  });
});

describe('hasOptionalValues', () => {
  it('neuer Kontakt: Bereich bleibt zu, auch mit vergebener Nummer', () => {
    const draft = emptyContact('customer');
    assert.equal(hasOptionalValues(draft), false);
    assert.equal(
      hasOptionalValues({ ...draft, customer: { ...draft.customer, customer_number: '10004' } }),
      false,
    );
  });
  it('Zahlungsziel beim Kunden oeffnet den Bereich', () => {
    const draft = emptyContact('customer');
    assert.equal(
      hasOptionalValues({ ...draft, customer: { ...draft.customer, payment_term_days: '30' } }),
      true,
    );
  });
  it('Werte einer nicht gewaehlten Rolle zaehlen nicht', () => {
    const draft = emptyContact('customer');
    assert.equal(
      hasOptionalValues({ ...draft, supplier: { ...draft.supplier, payment_term_days: '30' } }),
      false,
    );
  });
  it('Ansprechpartner-Name nur bei Firmen optional', () => {
    const person = { ...emptyContact('customer'), kind: 'person' as const, last_name: 'Meier' };
    assert.equal(hasOptionalValues(person), false);
    assert.equal(hasOptionalValues({ ...person, kind: 'company' }), true);
  });
});
