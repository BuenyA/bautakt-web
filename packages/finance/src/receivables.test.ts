import { describe, expect, it } from 'vitest';

import { computeOpenTasks, computeOverviewKpis, previousMonth } from './kpis';
import {
  agingBucket,
  buildReceivables,
  type PaymentRow,
  receivablesByBucket,
  type SalesDocumentRow,
  totalOverdueMinor,
} from './receivables';

const HEUTE = '2026-09-23';

function beleg(overrides: Partial<SalesDocumentRow> & { id: string }): SalesDocumentRow {
  return {
    type: 'invoice',
    status: 'sent',
    document_number: 'RE-1',
    issue_date: '2026-09-01',
    due_date: '2026-09-15',
    gross_total: 1000,
    net_total: 840.34,
    vat_total: 159.66,
    customer_id: null,
    ...overrides,
  };
}

describe('agingBucket', () => {
  it('trennt die Klassen an den Grenzen', () => {
    expect(agingBucket(0)).toBe('not_due');
    expect(agingBucket(1)).toBe('1_30');
    expect(agingBucket(30)).toBe('1_30');
    expect(agingBucket(31)).toBe('31_60');
    expect(agingBucket(60)).toBe('31_60');
    expect(agingBucket(61)).toBe('61_90');
    expect(agingBucket(90)).toBe('61_90');
    expect(agingBucket(91)).toBe('90_plus');
  });
});

describe('buildReceivables', () => {
  it('laesst Angebote und Entwuerfe aussen vor', () => {
    const documents = [
      beleg({ id: 'rechnung' }),
      beleg({ id: 'angebot', type: 'quote' }),
      beleg({ id: 'entwurf', status: 'draft' }),
      beleg({ id: 'bezahlt', status: 'paid' }),
    ];

    const items = buildReceivables(documents, [], HEUTE);

    expect(items.map((item) => item.document.id)).toEqual(['rechnung']);
  });

  it('zieht Zahlungen samt Skonto ab', () => {
    const payments: PaymentRow[] = [
      { document_id: 'rechnung', amount: 400, skonto_amount: 0 },
      { document_id: 'rechnung', amount: 100, skonto_amount: 50 },
    ];

    const [item] = buildReceivables([beleg({ id: 'rechnung' })], payments, HEUTE);

    expect(item.paidMinor).toBe(55_000);
    expect(item.openMinor).toBe(45_000);
  });

  it('nimmt einen vollstaendig bezahlten Beleg aus der Liste, auch ohne Statuswechsel', () => {
    // Sonst mahnt man jemanden, der bereits ueberwiesen hat.
    const payments: PaymentRow[] = [{ document_id: 'rechnung', amount: 1000, skonto_amount: 0 }];

    expect(buildReceivables([beleg({ id: 'rechnung' })], payments, HEUTE)).toEqual([]);
  });

  it('rechnet die Ueberfaelligkeit gegen den Stichtag', () => {
    const [item] = buildReceivables([beleg({ id: 'a', due_date: '2026-09-15' })], [], HEUTE);

    expect(item.daysOverdue).toBe(8);
    expect(item.bucket).toBe('1_30');
  });

  it('behandelt einen Beleg ohne Faelligkeit als nicht ueberfaellig', () => {
    const [item] = buildReceivables([beleg({ id: 'a', due_date: null })], [], HEUTE);

    expect(item.daysOverdue).toBe(0);
    expect(item.bucket).toBe('not_due');
  });
});

describe('receivablesByBucket', () => {
  it('summiert je Altersklasse und laesst leere Klassen bei null', () => {
    const documents = [
      beleg({ id: 'faellig-bald', due_date: '2026-10-01' }),
      beleg({ id: 'alt', due_date: '2026-05-01', gross_total: 2000 }),
    ];

    const summary = receivablesByBucket(buildReceivables(documents, [], HEUTE));

    expect(summary.not_due).toEqual({ count: 1, openMinor: 100_000 });
    expect(summary['90_plus']).toEqual({ count: 1, openMinor: 200_000 });
    expect(summary['31_60']).toEqual({ count: 0, openMinor: 0 });
  });

  it('zaehlt als ueberfaellig nur, was ueber die Faelligkeit hinaus ist', () => {
    const documents = [
      beleg({ id: 'offen', due_date: '2026-10-01' }),
      beleg({ id: 'ueberfaellig', due_date: '2026-09-01', gross_total: 300 }),
    ];

    expect(totalOverdueMinor(buildReceivables(documents, [], HEUTE))).toBe(30_000);
  });
});

describe('computeOverviewKpis', () => {
  it('zaehlt Umsatz nur aus ausgestellten Rechnungen des Monats', () => {
    const documents = [
      beleg({ id: 'sept', issue_date: '2026-09-04', gross_total: 1000 }),
      beleg({ id: 'sept-entwurf', issue_date: '2026-09-05', status: 'draft' }),
      beleg({ id: 'sept-angebot', issue_date: '2026-09-06', type: 'quote' }),
      beleg({ id: 'august', issue_date: '2026-08-04', gross_total: 500 }),
    ];

    const kpis = computeOverviewKpis(documents, [], '2026-09', HEUTE);

    expect(kpis.revenueMonthMinor).toBe(100_000);
    expect(kpis.revenuePreviousMonthMinor).toBe(50_000);
  });
});

describe('previousMonth', () => {
  it('geht ueber den Jahreswechsel', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-09')).toBe('2026-08');
  });
});

describe('computeOpenTasks', () => {
  it('zaehlt Entwuerfe, mahnfaehige Belege und bald faellige Eingangsrechnungen', () => {
    const documents = [
      beleg({ id: 'entwurf', status: 'draft' }),
      beleg({ id: 'mahnbar', due_date: '2026-09-01' }),
      beleg({ id: 'schon-gemahnt', due_date: '2026-09-01' }),
      beleg({ id: 'nicht-faellig', due_date: '2026-10-30' }),
    ];
    const incoming = [
      { id: 'bald', status: 'open', due_date: '2026-09-26', gross_total: 100 },
      { id: 'spaeter', status: 'open', due_date: '2026-11-01', gross_total: 100 },
      { id: 'bezahlt', status: 'paid', due_date: '2026-09-24', gross_total: 100 },
    ];

    const tasks = computeOpenTasks(documents, [], incoming, new Set(['schon-gemahnt']), HEUTE);

    expect(tasks.draftDocuments).toBe(1);
    expect(tasks.dunnable).toBe(1);
    expect(tasks.incomingDueSoon).toBe(1);
  });
});
