import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { absenceConflict } from './absenceConflict.ts';

const absence = (status: string, start: string, end: string, employment_id = 'e1') => ({
  employment_id,
  type: 'urlaub',
  status,
  start_date: start,
  end_date: end,
});

describe('absenceConflict', () => {
  it('findet genehmigten Urlaub am selben Tag', () => {
    const result = absenceConflict(
      [absence('genehmigt', '2026-10-11', '2026-10-11')],
      'e1',
      '2026-10-11',
      '2026-10-11',
    );
    assert.equal(result.approved?.start_date, '2026-10-11');
    assert.equal(result.pending, null);
  });

  it('zählt Grenztage mit, auch bei mehrtägigen Einsätzen', () => {
    const list = [absence('genehmigt', '2026-10-14', '2026-10-20')];
    assert.ok(absenceConflict(list, 'e1', '2026-10-12', '2026-10-14').approved);
    assert.equal(absenceConflict(list, 'e1', '2026-10-12', '2026-10-13').approved, null);
  });

  it('trennt beantragt von genehmigt und ignoriert abgelehnt und storniert', () => {
    const list = [
      absence('ausstehend', '2026-10-11', '2026-10-11'),
      absence('abgelehnt', '2026-10-11', '2026-10-11'),
      absence('storniert', '2026-10-11', '2026-10-11'),
    ];
    const result = absenceConflict(list, 'e1', '2026-10-11', '2026-10-11');
    assert.equal(result.approved, null);
    assert.equal(result.pending?.status, 'ausstehend');
  });

  it('schaut nur auf den gefragten Mitarbeiter', () => {
    const list = [absence('genehmigt', '2026-10-11', '2026-10-11', 'e2')];
    assert.equal(absenceConflict(list, 'e1', '2026-10-11', '2026-10-11').approved, null);
  });

  it('ohne Datum kein Konflikt', () => {
    const list = [absence('genehmigt', '2026-10-11', '2026-10-11')];
    assert.equal(absenceConflict(list, 'e1', '', '2026-10-11').approved, null);
  });
});
