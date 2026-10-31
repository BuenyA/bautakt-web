import { describe, expect, it } from 'vitest';

import {
  buildIncomingDesk,
  buildOutgoingDesk,
  type DeskIncomingRow,
  dueOf,
  isIncomingOverdue,
  matchesIncomingStatus,
  netRevenueMonth,
} from './invoiceDesk';
import { monthlyRevenue } from './monthly';
import type { SalesDocumentRow } from './receivables';

const HEUTE = '2026-10-14';

function beleg(overrides: Partial<SalesDocumentRow> & { id: string }): SalesDocumentRow {
  return {
    type: 'invoice',
    status: 'sent',
    document_number: 'RE-1',
    issue_date: '2026-10-01',
    due_date: '2026-10-20',
    gross_total: 119,
    net_total: 100,
    vat_total: 19,
    customer_id: null,
    ...overrides,
  };
}

function eingang(overrides: Partial<DeskIncomingRow> & { id: string }): DeskIncomingRow {
  return {
    status: 'open',
    invoice_date: '2026-10-01',
    due_date: '2026-10-30',
    gross_total: 50,
    created_at: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('dueOf', () => {
  it('unterscheidet überfällig, bald fällig und offen', () => {
    expect(dueOf(HEUTE, '2026-10-11')).toEqual({ kind: 'overdue', days: 3 });
    expect(dueOf(HEUTE, '2026-10-14')).toEqual({ kind: 'dueSoon', days: 0 });
    expect(dueOf(HEUTE, '2026-10-21')).toEqual({ kind: 'dueSoon', days: 7 });
    expect(dueOf(HEUTE, '2026-10-22')).toEqual({ kind: 'open' });
    expect(dueOf(HEUTE, null)).toEqual({ kind: 'open' });
  });
});

describe('buildOutgoingDesk', () => {
  it('listet Offene nach Fälligkeit, Entwürfe am Ende, und summiert ohne Entwürfe', () => {
    const desk = buildOutgoingDesk(
      [
        beleg({ id: 'b', due_date: '2026-10-25' }),
        beleg({ id: 'a', due_date: '2026-10-01' }),
        beleg({ id: 'c', status: 'draft', issue_date: null, gross_total: 238 }),
        beleg({ id: 'd', status: 'paid' }),
        beleg({ id: 'e', type: 'quote', status: 'draft' }),
      ],
      [{ document_id: 'a', amount: 19, skonto_amount: null }],
      HEUTE,
    );

    expect(desk.entries.map((entry) => [entry.item.id, entry.due.kind, entry.minor])).toEqual([
      ['a', 'overdue', 10000],
      ['b', 'open', 11900],
      ['c', 'draft', 23800],
    ]);
    expect(desk.minor).toBe(10000 + 11900);
  });
});

describe('isIncomingOverdue', () => {
  it('nur unbezahlt mit Fälligkeit vor dem Stichtag', () => {
    expect(isIncomingOverdue({ status: 'open', due_date: '2026-10-13' }, HEUTE)).toBe(true);
    expect(isIncomingOverdue({ status: 'partially_paid', due_date: '2026-10-01' }, HEUTE)).toBe(
      true,
    );
    expect(isIncomingOverdue({ status: 'open', due_date: HEUTE }, HEUTE)).toBe(false);
    expect(isIncomingOverdue({ status: 'paid', due_date: '2026-10-01' }, HEUTE)).toBe(false);
    expect(isIncomingOverdue({ status: 'overdue', due_date: null }, HEUTE)).toBe(false);
  });
});

describe('matchesIncomingStatus', () => {
  const rows = [
    { id: 'entwurf', status: 'draft', due_date: '2026-10-01' },
    { id: 'offen', status: 'open', due_date: '2026-10-30' },
    { id: 'spaet', status: 'open', due_date: '2026-10-01' },
    { id: 'teil', status: 'partially_paid', due_date: null },
    { id: 'bezahlt', status: 'paid', due_date: '2026-10-01' },
  ];
  const ids = (filter: Parameters<typeof matchesIncomingStatus>[1]) =>
    rows.filter((row) => matchesIncomingStatus(row, filter, HEUTE)).map((row) => row.id);

  it('teilt die Liste nach Status', () => {
    expect(ids('all')).toHaveLength(5);
    expect(ids('open')).toEqual(['offen', 'spaet', 'teil']);
    expect(ids('draft')).toEqual(['entwurf']);
    expect(ids('paid')).toEqual(['bezahlt']);
  });

  it('überfällig zählt wie die Übersicht, auch Entwürfe mit Datum', () => {
    expect(ids('overdue')).toEqual(['entwurf', 'spaet']);
    const desk = buildIncomingDesk(
      rows.map((row) => ({ ...row, invoice_date: null, gross_total: 1, created_at: '' })),
      HEUTE,
    );
    expect(
      desk.entries.filter((entry) => entry.due.kind === 'overdue').map((entry) => entry.item.id),
    ).toEqual(ids('overdue'));
  });
});

describe('buildIncomingDesk', () => {
  it('listet Unbezahlte nach Fälligkeit; bezahlte fallen raus', () => {
    const desk = buildIncomingDesk(
      [
        eingang({ id: 'spaeter', due_date: '2026-11-30' }),
        eingang({ id: 'spaet', due_date: '2026-10-10' }),
        eingang({ id: 'bald', due_date: '2026-10-21' }),
        eingang({ id: 'ohne', due_date: null }),
        eingang({ id: 'bezahlt', status: 'paid', due_date: '2026-10-01' }),
      ],
      HEUTE,
    );

    expect(desk.entries.map((entry) => [entry.item.id, entry.due.kind])).toEqual([
      ['spaet', 'overdue'],
      ['bald', 'dueSoon'],
      ['spaeter', 'open'],
      ['ohne', 'open'],
    ]);
    expect(desk.minor).toBe(4 * 5000);
  });

  it('zählt den Restbetrag, wenn er bekannt ist (#270)', () => {
    const desk = buildIncomingDesk(
      [
        eingang({ id: 'teil', status: 'partially_paid', open_total: 12.34 }),
        eingang({ id: 'skonto', open_total: 0 }),
        eingang({ id: 'ohne' }),
      ],
      HEUTE,
    );
    expect(desk.entries.map((entry) => [entry.item.id, entry.minor])).toEqual([
      ['teil', 1234],
      ['skonto', 0],
      ['ohne', 5000],
    ]);
    expect(desk.minor).toBe(1234 + 5000);
  });
});

describe('Netto-Umsatz', () => {
  const docs = [
    beleg({ id: '1', issue_date: '2026-09-05', net_total: 200 }),
    beleg({ id: '2', issue_date: '2026-10-02', net_total: 300 }),
    beleg({ id: '3', issue_date: '2026-10-03', status: 'draft', net_total: 999 }),
  ];

  it('rechnet je Monat netto und nur ausgestellte Rechnungen', () => {
    expect(monthlyRevenue(docs, ['2026-09', '2026-10']).map((p) => p.minor)).toEqual([
      20000, 30000,
    ]);
  });

  it('vergleicht mit dem Vormonat', () => {
    expect(netRevenueMonth(docs, '2026-10')).toEqual({
      month: '2026-10',
      minor: 30000,
      previousMinor: 20000,
      deltaPercent: 50,
    });
    expect(netRevenueMonth(docs, '2026-09').deltaPercent).toBeNull();
  });
});
