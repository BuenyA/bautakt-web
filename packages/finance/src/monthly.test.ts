import { describe, expect, it } from 'vitest';

import { formatMonthShort, monthlyRevenue, monthlyTotals, monthRange } from './monthly';
import type { SalesDocumentRow } from './receivables';

function beleg(overrides: Partial<SalesDocumentRow> & { id: string }): SalesDocumentRow {
  return {
    type: 'invoice',
    status: 'paid',
    document_number: 'RE-1',
    issue_date: '2026-09-01',
    due_date: null,
    gross_total: 100,
    net_total: 84.03,
    vat_total: 15.97,
    customer_id: null,
    ...overrides,
  };
}

describe('monthRange', () => {
  it('geht ueber den Jahreswechsel zurueck', () => {
    expect(monthRange('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('monthlyRevenue', () => {
  it('haelt Monate ohne Umsatz mit 0 in der Reihe', () => {
    const months = monthRange('2026-03', 3);
    const points = monthlyRevenue([beleg({ id: 'a', issue_date: '2026-03-04' })], months);

    expect(points.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(points.map((point) => point.minor)).toEqual([0, 0, 10_000]);
  });

  it('laesst Entwuerfe und Angebote aussen vor', () => {
    const months = monthRange('2026-03', 1);
    const points = monthlyRevenue(
      [
        beleg({ id: 'a', issue_date: '2026-03-01' }),
        beleg({ id: 'b', issue_date: '2026-03-02', status: 'draft' }),
        beleg({ id: 'c', issue_date: '2026-03-03', type: 'quote' }),
      ],
      months,
    );

    expect(points[0]).toEqual({ month: '2026-03', minor: 10_000, count: 1 });
  });

  it('ignoriert Belege ausserhalb des Zeitraums', () => {
    const points = monthlyRevenue(
      [beleg({ id: 'alt', issue_date: '2024-01-01' })],
      monthRange('2026-03', 2),
    );

    expect(points.every((point) => point.minor === 0)).toBe(true);
  });
});

describe('monthlyTotals', () => {
  it('summiert je Monat und vertraegt Zeichenketten aus der Datenbank', () => {
    const points = monthlyTotals(
      [
        { dateIso: '2026-03-01', amount: '10.50' },
        { dateIso: '2026-03-31', amount: 9.5 },
        { dateIso: '2026-02-15', amount: null },
      ],
      monthRange('2026-03', 2),
    );

    expect(points[0]).toEqual({ month: '2026-02', minor: 0, count: 1 });
    expect(points[1]).toEqual({ month: '2026-03', minor: 2_000, count: 2 });
  });
});

describe('formatMonthShort', () => {
  it('kuerzt fuer die Achse', () => {
    expect(formatMonthShort('2026-09')).toBe('09/26');
  });
});
