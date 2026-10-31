import { describe, expect, it } from 'vitest';

import type { LaborTimeEntry } from './laborCost';
import { computeOrderFinance, orderCostLevel, type OrderFinanceInput } from './orderFinance';
import type { SalesDocumentRow } from './receivables';

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
    cost_rate: 40,
    employment_id: 'emp-1',
    order_id: 'ord-1',
    ...overrides,
  };
}

function input(overrides: Partial<OrderFinanceInput> = {}): OrderFinanceInput {
  return {
    contractSum: 10_000,
    documents: [],
    materials: [],
    expenses: [],
    incoming: [],
    labor: null,
    ...overrides,
  };
}

describe('computeOrderFinance', () => {
  it('summiert Material, Lohn, Ausgaben und Eingangsrechnungen netto', () => {
    const result = computeOrderFinance(
      input({
        materials: [
          { quantity: 3, unit_cost: 12.5 },
          // Ohne Einkaufspreis zählt die Zeile nicht.
          { quantity: 10, unit_cost: null },
        ],
        expenses: [
          { amount_net: 200, is_calculatory: false },
          { amount_net: 999, is_calculatory: true },
        ],
        incoming: [{ net_total: 300 }],
        labor: { entries: [eintrag()], rates: [] },
      }),
    );

    expect(result.materialMinor).toBe(3750);
    // 8 h × 40 €/h
    expect(result.laborMinor).toBe(32_000);
    expect(result.otherMinor).toBe(50_000);
    expect(result.costMinor).toBe(85_750);
  });

  it('rechnet ohne Lohn, wenn er nicht geladen werden darf', () => {
    const result = computeOrderFinance(
      input({ expenses: [{ amount_net: 100, is_calculatory: false }] }),
    );
    expect(result.laborMinor).toBeNull();
    expect(result.costMinor).toBe(10_000);
  });

  it('zählt nur ausgestellte Rechnungen als abgerechnet', () => {
    const result = computeOrderFinance(
      input({
        documents: [
          beleg({ id: 'a', net_total: 4000 }),
          beleg({ id: 'b', status: 'draft', net_total: 1000 }),
          beleg({ id: 'c', status: 'cancelled', net_total: 1000 }),
          beleg({ id: 'd', type: 'quote', net_total: 10_000 }),
          beleg({ id: 'e', type: 'partial_invoice', status: 'paid', net_total: 2000 }),
        ],
      }),
    );
    expect(result.billedMinor).toBe(600_000);
    expect(result.billedPercent).toBe(60);
    expect(result.openMinor).toBe(400_000);
  });

  it('lässt den offenen Betrag nicht unter null fallen', () => {
    const result = computeOrderFinance(
      input({ contractSum: 1000, documents: [beleg({ id: 'a', net_total: 1500 })] }),
    );
    expect(result.openMinor).toBe(0);
    expect(result.billedPercent).toBe(150);
  });

  it('gibt ohne Auftragssumme keine Anteile', () => {
    const result = computeOrderFinance(
      input({ contractSum: null, expenses: [{ amount_net: 100, is_calculatory: false }] }),
    );
    expect(result.contractMinor).toBeNull();
    expect(result.costPercent).toBeNull();
    expect(result.openMinor).toBeNull();
    expect(result.costLevel).toBe('ok');
  });

  it('rechnet das Ergebnis aus Abgerechnetem minus Kosten', () => {
    const result = computeOrderFinance(
      input({
        documents: [beleg({ id: 'a', net_total: 1000 })],
        expenses: [{ amount_net: 400, is_calculatory: false }],
      }),
    );
    expect(result.resultMinor).toBe(60_000);
  });
});

describe('orderCostLevel', () => {
  it('warnt ab 90 % und schlägt über 100 % Alarm', () => {
    expect(orderCostLevel(null)).toBe('ok');
    expect(orderCostLevel(89)).toBe('ok');
    expect(orderCostLevel(90)).toBe('warning');
    expect(orderCostLevel(100)).toBe('warning');
    expect(orderCostLevel(101)).toBe('danger');
  });
});
