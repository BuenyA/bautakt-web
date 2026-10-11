import { describe, expect, it } from 'vitest';

import { type LaborRateRow, type LaborTimeEntry, resolveCostRate } from './laborCost';
import type { SalesDocumentRow } from './receivables';
import { computeYearResult } from './result';

function beleg(overrides: Partial<SalesDocumentRow> & { id: string }): SalesDocumentRow {
  return {
    type: 'invoice',
    status: 'sent',
    document_number: 'RE-1',
    issue_date: '2026-03-01',
    due_date: null,
    gross_total: 119,
    net_total: 100,
    vat_total: 19,
    customer_id: null,
    ...overrides,
  };
}

function eintrag(overrides: Partial<LaborTimeEntry> = {}): LaborTimeEntry {
  return {
    started_at: '2026-03-02T07:00:00',
    ended_at: '2026-03-02T16:00:00',
    break_minutes: 60,
    cost_rate: null,
    employment_id: 'emp-1',
    order_id: 'ord-1',
    ...overrides,
  };
}

function satz(overrides: Partial<LaborRateRow>): LaborRateRow {
  return {
    scope: 'company',
    cost_rate: 40,
    order_id: null,
    employment_id: null,
    valid_from: '2020-01-01',
    valid_to: null,
    ...overrides,
  };
}

describe('computeYearResult', () => {
  const basis = {
    expenses: [],
    incoming: [],
    labor: null,
    referenceIso: '2026-10-11',
  };

  it('rechnet netto und nur ausgestellte Rechnungen des laufenden Jahres', () => {
    const result = computeYearResult({
      ...basis,
      documents: [
        beleg({ id: 'a' }),
        beleg({ id: 'entwurf', status: 'draft' }),
        beleg({ id: 'angebot', type: 'quote' }),
        beleg({ id: 'vorjahr', issue_date: '2025-12-31' }),
        beleg({ id: 'zukunft', issue_date: '2026-10-12' }),
      ],
    });
    expect(result.revenueMinor).toBe(10_000);
    expect(result.revenuePreviousYearMinor).toBe(0);
  });

  it('vergleicht mit demselben Zeitraum im Vorjahr', () => {
    const result = computeYearResult({
      ...basis,
      documents: [
        beleg({ id: 'in', issue_date: '2025-10-11' }),
        beleg({ id: 'danach', issue_date: '2025-10-12' }),
      ],
    });
    expect(result.revenuePreviousYearMinor).toBe(10_000);
  });

  it('laesst kalkulatorische Kosten weg und zaehlt Eingangsrechnungen netto', () => {
    const result = computeYearResult({
      ...basis,
      documents: [beleg({ id: 'a', net_total: 1000 })],
      expenses: [
        { invoice_date: '2026-02-01', amount_net: 100, is_calculatory: false },
        { invoice_date: '2026-02-01', amount_net: 999, is_calculatory: true },
      ],
      incoming: [{ invoice_date: '2026-04-01', net_total: 200 }],
    });
    expect(result.materialAndOverheadMinor).toBe(30_000);
    expect(result.laborMinor).toBeNull();
    expect(result.resultMinor).toBe(70_000);
    expect(result.marginPercent).toBe(70);
  });

  it('zieht Lohnkosten ab, wenn sie gerechnet werden', () => {
    const result = computeYearResult({
      ...basis,
      documents: [beleg({ id: 'a', net_total: 1000 })],
      labor: { entries: [eintrag()], rates: [satz({ cost_rate: 40 })] },
    });
    // 8 Stunden × 40 €
    expect(result.laborMinor).toBe(32_000);
    expect(result.expensesMinor).toBe(32_000);
    expect(result.resultMinor).toBe(68_000);
  });

  it('meldet keine Marge ohne Umsatz', () => {
    expect(computeYearResult({ ...basis, documents: [] }).marginPercent).toBeNull();
  });
});

describe('resolveCostRate', () => {
  it('nimmt den gestempelten Satz zuerst', () => {
    expect(resolveCostRate(eintrag({ cost_rate: 55 }), [satz({})])).toBe(55);
  });

  it('geht Auftrag vor Mitarbeiter vor Firma', () => {
    const rates = [
      satz({ cost_rate: 40 }),
      satz({ scope: 'employment', employment_id: 'emp-1', cost_rate: 45 }),
      satz({ scope: 'order', order_id: 'ord-1', cost_rate: 50 }),
    ];
    expect(resolveCostRate(eintrag(), rates)).toBe(50);
    expect(resolveCostRate(eintrag({ order_id: 'anderer' }), rates)).toBe(45);
    expect(resolveCostRate(eintrag({ order_id: null, employment_id: null }), rates)).toBe(40);
  });

  it('nimmt den juengsten gueltigen Satz und ignoriert abgelaufene', () => {
    const rates = [
      satz({ cost_rate: 30, valid_from: '2020-01-01', valid_to: '2026-01-01' }),
      satz({ cost_rate: 42, valid_from: '2026-01-01' }),
    ];
    expect(resolveCostRate(eintrag(), rates)).toBe(42);
  });

  it('faellt auf den Firmenstandard zurueck statt auf 0', () => {
    expect(resolveCostRate(eintrag(), [])).toBe(38);
  });
});
