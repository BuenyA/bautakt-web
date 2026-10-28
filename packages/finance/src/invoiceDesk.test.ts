import { describe, expect, it } from 'vitest';

import {
  buildIncomingDesk,
  buildOutgoingDesk,
  type DeskIncomingRow,
  dueOf,
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
