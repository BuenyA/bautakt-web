import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeLeaveQuota, countWorkingDays, proRataEntitlement } from './leaveQuota.ts';

const settings = { annualLeaveDays: 30, countsWeekendsAsLeave: false };
const fullYear = {
  startedAt: '2020-01-01',
  endedAt: null,
  annualLeaveDaysOverride: null,
  annualLeaveDaysOverrideIsManual: false,
  weekendCountsAsLeaveOverride: null,
};

describe('countWorkingDays', () => {
  it('lässt Wochenende und Feiertage weg', () => {
    // Mo 21.12. bis So 27.12.2026: 25. und 26. sind Feiertage, 26./27. Wochenende.
    assert.equal(countWorkingDays('2026-12-21', '2026-12-27', false), 4);
  });

  it('zählt das Wochenende mit, wenn der Betrieb das so will', () => {
    assert.equal(countWorkingDays('2026-10-31', '2026-11-01', true), 2);
  });
});

describe('proRataEntitlement', () => {
  it('gibt den vollen Anspruch bei ganzem Jahr', () => {
    assert.equal(proRataEntitlement(fullYear, settings, 2026), 30);
  });

  it('rechnet einen Eintritt zur Jahresmitte anteilig auf halbe Tage', () => {
    assert.equal(
      proRataEntitlement({ startedAt: '2026-07-01', endedAt: null }, settings, 2026),
      15,
    );
  });
});

describe('computeLeaveQuota', () => {
  it('zieht nur genehmigten Urlaub ab und weist beantragten getrennt aus', () => {
    const quota = computeLeaveQuota(
      fullYear,
      settings,
      [
        { type: 'urlaub', status: 'genehmigt', start_date: '2026-08-03', end_date: '2026-08-07' },
        { type: 'urlaub', status: 'ausstehend', start_date: '2026-11-02', end_date: '2026-11-03' },
        {
          type: 'krankheit',
          status: 'genehmigt',
          start_date: '2026-03-02',
          end_date: '2026-03-03',
        },
        { type: 'urlaub', status: 'abgelehnt', start_date: '2026-09-07', end_date: '2026-09-08' },
      ],
      2026,
    );
    assert.equal(quota.entitlement, 30);
    assert.equal(quota.used, 5);
    assert.equal(quota.pending, 2);
    assert.equal(quota.remaining, 25);
  });

  it('nimmt den manuellen Anspruch, wenn gesetzt', () => {
    const quota = computeLeaveQuota(
      { ...fullYear, annualLeaveDaysOverride: 28, annualLeaveDaysOverrideIsManual: true },
      settings,
      [],
      2026,
    );
    assert.equal(quota.entitlement, 28);
  });
});
