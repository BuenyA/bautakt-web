/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayAfter, type LifecycleRow, lifecycleView } from './lifecycle.ts';

const row = (over: Partial<LifecycleRow>): LifecycleRow => ({
  company_id: 'a',
  company_name: 'Betrieb A',
  lifecycle_status: 'active',
  contract_end_date: null,
  export_deadline: null,
  delete_after: null,
  is_owner: false,
  access: 'write',
  ...over,
});

describe('lifecycleView', () => {
  it('aktiv, Karenz und unbekannt: normal', () => {
    assert.deepEqual(lifecycleView(undefined, 'a'), { kind: 'normal' });
    assert.deepEqual(lifecycleView([row({})], 'a'), { kind: 'normal' });
    assert.deepEqual(
      lifecycleView(
        [row({ lifecycle_status: 'terminating', contract_end_date: '2026-11-14' })],
        'a',
      ),
      { kind: 'normal' },
    );
    assert.deepEqual(lifecycleView([row({})], 'x'), { kind: 'normal' });
  });

  it('Inhaber in der Bedenkzeit: Hinweis mit Vertragsende', () => {
    assert.deepEqual(
      lifecycleView(
        [row({ lifecycle_status: 'terminating', contract_end_date: '2026-11-14', is_owner: true })],
        'a',
      ),
      { kind: 'terminating', contractEnd: '2026-11-14' },
    );
  });

  it('Inhaber in export_only: nur lesen, mit Frist', () => {
    const view = lifecycleView(
      [
        row({
          lifecycle_status: 'export_only',
          is_owner: true,
          access: 'read',
          contract_end_date: '2026-11-01',
          export_deadline: '2026-12-01',
        }),
      ],
      'a',
    );
    assert.deepEqual(view, {
      kind: 'readOnly',
      contractEnd: '2026-11-01',
      exportDeadline: '2026-12-01',
    });
  });

  it('Mitarbeiter in export_only und alle in locked: gesperrt, mit Ausweichbetrieben', () => {
    const rows = [
      row({ lifecycle_status: 'export_only', access: 'none', contract_end_date: '2026-11-01' }),
      row({ company_id: 'b', company_name: 'Betrieb B' }),
      row({
        company_id: 'c',
        company_name: 'Betrieb C',
        lifecycle_status: 'locked',
        access: 'none',
      }),
    ];
    const view = lifecycleView(rows, 'a');
    assert.equal(view.kind, 'locked');
    assert.deepEqual(view.kind === 'locked' && view.alternatives, [
      { companyId: 'b', name: 'Betrieb B' },
    ]);
    const owner = lifecycleView(
      [row({ lifecycle_status: 'locked', access: 'none', is_owner: true })],
      'a',
    );
    assert.equal(owner.kind === 'locked' && owner.isOwner, true);
  });
});

describe('dayAfter', () => {
  it('über Monats- und Jahresgrenzen', () => {
    assert.equal(dayAfter('2026-12-01'), '2026-12-02');
    assert.equal(dayAfter('2026-11-30'), '2026-12-01');
    assert.equal(dayAfter('2026-12-31'), '2027-01-01');
  });
});
