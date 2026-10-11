import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatMinutesAsHours, netMinutes, sumNetMinutes, totalsByEmployee } from './timeTotals.ts';

const row = (
  employment: string | null,
  name: string,
  start: string,
  end: string | null,
  pause = 0,
) => ({
  employment_id: employment,
  employee_name: name,
  started_at: start,
  ended_at: end,
  break_minutes: pause,
});

describe('netMinutes', () => {
  it('zieht die Pause ab und zählt laufende Einträge mit 0', () => {
    assert.equal(netMinutes(row('a', 'A', '2026-10-12T07:00:00', '2026-10-12T16:00:00', 30)), 510);
    assert.equal(netMinutes(row('a', 'A', '2026-10-12T07:00:00', null)), 0);
    assert.equal(netMinutes(row('a', 'A', '2026-10-12T07:00:00', '2026-10-12T07:10:00', 30)), 0);
  });
});

describe('totalsByEmployee', () => {
  it('summiert je Beschäftigung, die meisten Stunden zuerst', () => {
    const totals = totalsByEmployee([
      row('a', 'Anna', '2026-10-12T07:00:00', '2026-10-12T11:00:00'),
      row('b', 'Ben', '2026-10-12T07:00:00', '2026-10-12T16:00:00', 30),
      row('a', 'Anna', '2026-10-13T07:00:00', '2026-10-13T09:00:00'),
      row(null, 'Alt', '2026-10-13T07:00:00', '2026-10-13T08:00:00'),
    ]);
    assert.deepEqual(
      totals.map(({ name, minutes, count }) => [name, minutes, count]),
      [
        ['Ben', 510, 1],
        ['Anna', 360, 2],
        ['Alt', 60, 1],
      ],
    );
  });
});

describe('sumNetMinutes / formatMinutesAsHours', () => {
  it('schreibt Stunden wie formatNetDuration', () => {
    const rows = [
      row('a', 'A', '2026-10-12T07:00:00', '2026-10-12T16:00:00', 30),
      row('b', 'B', '2026-10-12T07:00:00', '2026-10-12T07:45:00'),
    ];
    assert.equal(sumNetMinutes(rows), 555);
    assert.equal(formatMinutesAsHours(555), '9:15 Std.');
    assert.equal(formatMinutesAsHours(0), '0:00 Std.');
  });
});
