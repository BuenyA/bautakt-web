/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayBefore, type LifecycleRow } from '../company/lifecycle.ts';
import { berlinToday, terminationErrorKey, terminationState } from './termination.ts';

const row = (over: Partial<LifecycleRow>): LifecycleRow => ({
  company_id: 'a',
  company_name: 'Betrieb A',
  lifecycle_status: 'active',
  contract_end_date: null,
  export_deadline: null,
  delete_after: null,
  is_owner: true,
  access: 'write',
  ...over,
});

describe('terminationState', () => {
  it('aktiv oder unbekannt: Antrag möglich', () => {
    assert.deepEqual(terminationState(undefined, '2026-11-07'), { kind: 'active' });
    assert.deepEqual(terminationState(row({}), '2026-11-07'), { kind: 'active' });
  });

  it('Bedenkzeit: Widerruf bis zum Vortag von E', () => {
    const r = row({ lifecycle_status: 'terminating', contract_end_date: '2026-11-14' });
    assert.deepEqual(terminationState(r, '2026-11-13'), {
      kind: 'pending',
      contractEnd: '2026-11-14',
      revocableUntil: '2026-11-13',
      canRevoke: true,
    });
    // Am Tag E, bevor der Job umstellt: kein Widerruf mehr.
    assert.equal((terminationState(r, '2026-11-14') as { canRevoke: boolean }).canRevoke, false);
  });

  it('nach E: beendet', () => {
    assert.deepEqual(
      terminationState(
        row({ lifecycle_status: 'export_only', contract_end_date: '2026-11-14', access: 'read' }),
        '2026-11-20',
      ),
      { kind: 'ended', contractEnd: '2026-11-14' },
    );
  });
});

describe('Datum', () => {
  it('dayBefore über Monats- und Jahresgrenzen', () => {
    assert.equal(dayBefore('2026-12-01'), '2026-11-30');
    assert.equal(dayBefore('2027-01-01'), '2026-12-31');
    assert.equal(dayBefore('2028-03-01'), '2028-02-29');
  });

  it('berlinToday rechnet in Europe/Berlin', () => {
    // 23:30 UTC am 6.11. ist in Berlin schon der 7.11.
    assert.equal(berlinToday(new Date('2026-11-06T23:30:00Z')), '2026-11-07');
    assert.equal(berlinToday(new Date('2026-11-06T22:30:00Z')), '2026-11-06');
  });
});

describe('terminationErrorKey', () => {
  it('Code am Anfang der Meldung', () => {
    assert.equal(
      terminationErrorKey('COMPANY_TERMINATION_REAUTH_REQUIRED'),
      'companySettings:delete.errors.reauth',
    );
    assert.equal(
      terminationErrorKey('COMPANY_TERMINATION_NOT_ACTIVE: terminating'),
      'companySettings:delete.errors.notActive',
    );
    assert.equal(terminationErrorKey('permission denied'), 'companySettings:delete.errors.unknown');
    assert.equal(terminationErrorKey(undefined), 'companySettings:delete.errors.unknown');
  });
});
