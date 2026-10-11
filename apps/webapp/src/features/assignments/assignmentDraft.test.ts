import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { diffEmployees, draftFromAssignment, emptyAssignment } from './assignmentDraft.ts';

describe('diffEmployees', () => {
  it('meldet nur neue und entfernte Zuweisungen', () => {
    assert.deepEqual(diffEmployees(['a', 'b'], ['b', 'c']), { added: ['c'], removed: ['a'] });
  });

  it('ändert nichts, wenn die Auswahl gleich bleibt', () => {
    assert.deepEqual(diffEmployees(['a', 'b'], ['b', 'a']), { added: [], removed: [] });
  });

  it('ignoriert leere und doppelte Einträge', () => {
    assert.deepEqual(diffEmployees([], ['a', '', 'a']), { added: ['a'], removed: [] });
  });
});

describe('draftFromAssignment', () => {
  it('zerlegt die Zeiten in Ortszeit', () => {
    const start = new Date(2026, 9, 13, 7, 30);
    const end = new Date(2026, 9, 14, 1, 5);
    const draft = draftFromAssignment({
      order_id: 'o1',
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      note: 'Gerüst',
      employmentIds: ['e1'],
    });
    assert.deepEqual(draft, {
      orderId: 'o1',
      startDate: '2026-10-13',
      startTime: '07:30',
      endDate: '2026-10-14',
      endTime: '01:05',
      employmentIds: ['e1'],
      note: 'Gerüst',
    });
  });
});

describe('emptyAssignment', () => {
  it('belegt Tag und Stunde aus dem Wochenplan vor', () => {
    const draft = emptyAssignment({ dayIso: '2026-10-13', hour: 9 });
    assert.equal(draft.startDate, '2026-10-13');
    assert.equal(draft.startTime, '09:00');
    assert.equal(draft.endTime, '10:00');
  });

  it('rollt um 23 Uhr in den nächsten Tag', () => {
    const draft = emptyAssignment({ dayIso: '2026-10-13', hour: 23 });
    assert.equal(draft.endDate, '2026-10-14');
    assert.equal(draft.endTime, '00:00');
  });
});
