import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { datevReleaseHints, type DatevResolvedRow, sortRevenueAccounts } from './datevAccounts.ts';

const row = (patch: Partial<DatevResolvedRow> = {}): DatevResolvedRow => ({
  tax_mode: 'standard',
  tax_rate_percent: 19,
  revenue_account: '8400',
  debtor_account: '10000',
  debtor_source: 'customer',
  warnings: [],
  ...patch,
});

describe('datevReleaseHints', () => {
  it('ohne Positionen: keine Hinweise', () => {
    assert.deepEqual(datevReleaseHints([]), []);
  });

  it('Kundennummer und Konten vorhanden: keine Hinweise', () => {
    assert.deepEqual(
      datevReleaseHints([row(), row({ tax_rate_percent: 7, revenue_account: '8300' })]),
      [],
    );
  });

  it('ohne Kundennummer: Sammel-Debitor', () => {
    assert.deepEqual(
      datevReleaseHints([
        row({ debtor_account: '69999', debtor_source: 'collective', warnings: ['debtor_missing'] }),
      ]),
      [{ kind: 'debtorCollective', reason: 'missing', account: '69999' }],
    );
  });

  it('ungültige Kundennummer: Sammel-Debitor mit Grund', () => {
    assert.deepEqual(
      datevReleaseHints([
        row({ debtor_account: '69999', debtor_source: 'collective', warnings: ['debtor_invalid'] }),
      ]),
      [{ kind: 'debtorCollective', reason: 'invalid', account: '69999' }],
    );
  });

  it('kein Debitor auflösbar', () => {
    assert.deepEqual(
      datevReleaseHints([
        row({
          debtor_account: null,
          debtor_source: null,
          warnings: ['debtor_missing', 'debtor_unresolved'],
        }),
      ]),
      [{ kind: 'debtorUnresolved' }],
    );
  });

  it('fehlendes Erlöskonto je Satz, Exportwarnungen bleiben außen vor', () => {
    assert.deepEqual(
      datevReleaseHints([
        row({ warnings: ['numbers_missing'] }),
        row({ tax_rate_percent: 7, revenue_account: null, warnings: ['account_missing'] }),
      ]),
      [{ kind: 'accountMissing', taxMode: 'standard', rate: 7 }],
    );
  });
});

describe('sortRevenueAccounts', () => {
  it('Regelsteuer zuerst, höherer Satz vorn', () => {
    const base = { net_amount: 1, revenue_account: '1', tax_key: '' };
    const sorted = sortRevenueAccounts([
      { ...base, tax_mode: 'reverse_charge', tax_rate_percent: 0 },
      { ...base, tax_mode: 'standard', tax_rate_percent: 7 },
      { ...base, tax_mode: 'standard', tax_rate_percent: 19 },
    ]);
    assert.deepEqual(
      sorted.map((entry) => `${entry.tax_mode} ${entry.tax_rate_percent}`),
      ['standard 19', 'standard 7', 'reverse_charge 0'],
    );
  });
});
