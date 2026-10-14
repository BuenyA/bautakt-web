import { describe, expect, it } from 'vitest';

import {
  buildIncomingDesk,
  buildOutgoingDesk,
  type DeskIncomingRow,
  firstFilledGroup,
  INCOMING_GROUP_ORDER,
  netRevenueMonth,
  OUTGOING_GROUP_ORDER,
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

describe('buildOutgoingDesk', () => {
  it('ordnet Überfällige auch unter Offen ein und summiert offene Beträge', () => {
    const desk = buildOutgoingDesk(
      [
        beleg({ id: 'a', due_date: '2026-10-01' }),
        beleg({ id: 'b', due_date: '2026-10-25' }),
        beleg({ id: 'c', status: 'draft', issue_date: null, gross_total: 238 }),
        beleg({ id: 'd', status: 'paid' }),
        beleg({ id: 'e', type: 'quote', status: 'draft' }),
      ],
      [{ document_id: 'a', amount: 19, skonto_amount: null }],
      HEUTE,
    );

    expect(desk.overdue.items.map((item) => item.document.id)).toEqual(['a']);
    expect(desk.overdue.minor).toBe(10000);
    expect(desk.open.items.map((item) => item.document.id)).toEqual(['a', 'b']);
    expect(desk.open.minor).toBe(10000 + 11900);
    expect(desk.draft.items.map((item) => item.document.id)).toEqual(['c']);
    expect(desk.draft.minor).toBe(23800);
  });

  it('wählt die erste Gruppe mit Inhalt vor', () => {
    const desk = buildOutgoingDesk([beleg({ id: 'x', status: 'draft' })], [], HEUTE);
    expect(firstFilledGroup(OUTGOING_GROUP_ORDER, desk)).toBe('draft');
    const leer = buildOutgoingDesk([], [], HEUTE);
    expect(firstFilledGroup(OUTGOING_GROUP_ORDER, leer)).toBe('overdue');
  });
});

describe('buildIncomingDesk', () => {
  it('trennt neu, überfällig, bald fällig und offen; bezahlte fallen raus', () => {
    const desk = buildIncomingDesk(
      [
        eingang({ id: 'neu', created_at: '2026-10-13T09:00:00.000Z', due_date: '2026-11-30' }),
        eingang({ id: 'spaet', due_date: '2026-10-10' }),
        eingang({ id: 'bald', due_date: '2026-10-21' }),
        eingang({ id: 'ohne', due_date: null }),
        eingang({ id: 'bezahlt', status: 'paid', due_date: '2026-10-01' }),
      ],
      HEUTE,
      '2026-10-13T00:00:00.000Z',
    );

    expect(desk.new.items.map((row) => row.id)).toEqual(['neu']);
    expect(desk.overdue.items.map((row) => row.id)).toEqual(['spaet']);
    expect(desk.dueSoon.items.map((row) => row.id)).toEqual(['bald']);
    expect(desk.open.items.map((row) => row.id)).toEqual(['spaet', 'bald', 'neu', 'ohne']);
    expect(desk.open.minor).toBe(4 * 5000);
    expect(firstFilledGroup(INCOMING_GROUP_ORDER, desk)).toBe('new');
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
