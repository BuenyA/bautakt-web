// Die erwarteten Zeitpunkte gelten für Europe/Berlin und stimmen mit der
// Handy-App (`rrule` in Ortszeit) überein. Ohne feste Zeitzone wären die
// Fälle zur Zeitumstellung rechnerabhängig.
process.env.TZ = 'Europe/Berlin';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRecurrenceRule,
  type CalendarEventRow,
  coversDay,
  expandOccurrences,
  monthGridDays,
  parseRecurrence,
  shiftSeries,
  toTimestamps,
  withEnd,
  withStart,
} from './calendarModel.ts';

function row(partial: Partial<CalendarEventRow> & Pick<CalendarEventRow, 'id'>): CalendarEventRow {
  return {
    user_id: 'u1',
    event_type: 'me',
    title: 'Termin',
    description: '',
    starts_at: '2026-10-12T06:00:00.000Z',
    ends_at: '2026-10-12T07:00:00.000Z',
    all_day: false,
    recurrence_rule: null,
    parent_event_id: null,
    recurrence_id: null,
    is_cancelled: false,
    reminder_minutes: null,
    ...partial,
  };
}

const starts = (rows: CalendarEventRow[], from: string, to: string) =>
  expandOccurrences(rows, new Date(from), new Date(to)).map((occurrence) => occurrence.startsAt);

describe('buildRecurrenceRule / parseRecurrence', () => {
  it('schreibt die Regel wie rrule in der App', () => {
    assert.equal(buildRecurrenceRule('none', null), null);
    assert.equal(buildRecurrenceRule('monthly', null), 'RRULE:FREQ=MONTHLY;INTERVAL=1');
    assert.equal(
      buildRecurrenceRule('weekly', '2026-12-31'),
      'RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T225959Z',
    );
  });

  it('liest Art und letzten Tag zurück', () => {
    assert.deepEqual(parseRecurrence('RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T225959Z'), {
      type: 'weekly',
      untilIso: '2026-12-31',
    });
    assert.deepEqual(parseRecurrence('FREQ=DAILY;INTERVAL=1'), { type: 'daily', untilIso: null });
    assert.deepEqual(parseRecurrence(null), { type: 'none', untilIso: null });
  });
});

describe('expandOccurrences', () => {
  it('wöchentlich bleibt über die Zeitumstellung um dieselbe Ortszeit (08:00)', () => {
    const master = row({ id: 'm', recurrence_rule: 'RRULE:FREQ=WEEKLY;INTERVAL=1' });
    assert.deepEqual(starts([master], '2026-10-01T00:00:00Z', '2026-10-31T23:00:00Z'), [
      '2026-10-12T06:00:00.000Z',
      '2026-10-19T06:00:00.000Z',
      '2026-10-26T07:00:00.000Z',
    ]);
  });

  it('alte, in UTC gerechnete Ausnahmen finden ihr Vorkommen über den Tag', () => {
    const master = row({ id: 'm', recurrence_rule: 'RRULE:FREQ=WEEKLY;INTERVAL=1' });
    const oldCancel = row({
      id: 'x',
      parent_event_id: 'm',
      recurrence_id: '2026-10-26T06:00:00.000Z',
      is_cancelled: true,
    });
    assert.deepEqual(
      starts([master, oldCancel], '2026-10-20T00:00:00Z', '2026-10-31T23:00:00Z'),
      [],
    );
  });

  it('endet mit UNTIL einschließlich des letzten Tages', () => {
    const master = row({
      id: 'm',
      recurrence_rule: 'RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261102T225959Z',
    });
    assert.deepEqual(starts([master], '2026-10-01T00:00:00Z', '2026-12-01T00:00:00Z'), [
      '2026-10-12T06:00:00.000Z',
      '2026-10-19T06:00:00.000Z',
      '2026-10-26T07:00:00.000Z',
      '2026-11-02T07:00:00.000Z',
    ]);
  });

  it('monatlich am 31. überspringt kurze Monate', () => {
    const master = row({
      id: 'm',
      starts_at: '2026-01-31T07:00:00.000Z',
      ends_at: '2026-01-31T08:00:00.000Z',
      recurrence_rule: 'RRULE:FREQ=MONTHLY;INTERVAL=1',
    });
    assert.deepEqual(starts([master], '2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z'), [
      '2026-01-31T07:00:00.000Z',
      '2026-03-31T06:00:00.000Z',
      '2026-05-31T06:00:00.000Z',
    ]);
  });

  it('Ausnahmen verschieben oder streichen ein Vorkommen', () => {
    const master = row({ id: 'm', recurrence_rule: 'RRULE:FREQ=DAILY;INTERVAL=1' });
    const moved = row({
      id: 'x1',
      parent_event_id: 'm',
      recurrence_id: '2026-10-13T06:00:00.000Z',
      starts_at: '2026-10-13T10:00:00.000Z',
      ends_at: '2026-10-13T11:00:00.000Z',
      title: 'Verschoben',
    });
    const cancelled = row({
      id: 'x2',
      parent_event_id: 'm',
      recurrence_id: '2026-10-14T06:00:00.000Z',
      is_cancelled: true,
    });
    const result = expandOccurrences(
      [master, moved, cancelled],
      new Date('2026-10-12T00:00:00Z'),
      new Date('2026-10-15T23:00:00Z'),
    );
    assert.deepEqual(
      result.map((o) => [o.startsAt, o.rowId, o.isException]),
      [
        ['2026-10-12T06:00:00.000Z', 'm', false],
        ['2026-10-13T10:00:00.000Z', 'x1', true],
        ['2026-10-15T06:00:00.000Z', 'm', false],
      ],
    );
    assert.equal(result[1].recurrenceId, '2026-10-13T06:00:00.000Z');
  });

  it('Einzeltermine nur, wenn sie den Zeitraum berühren', () => {
    const single = row({ id: 's' });
    assert.equal(starts([single], '2026-10-12T00:00:00Z', '2026-10-12T23:00:00Z').length, 1);
    assert.equal(starts([single], '2026-10-13T00:00:00Z', '2026-10-13T23:00:00Z').length, 0);
  });
});

describe('Tage', () => {
  it('Monatsraster beginnt am Montag und hat sechs Wochen', () => {
    const days = monthGridDays(2026, 9);
    assert.equal(days.length, 42);
    assert.equal(days[0], '2026-09-28');
  });

  it('coversDay: mehrtägig ja, Ende genau um Mitternacht nicht am Folgetag', () => {
    const start = new Date(2026, 9, 12, 20, 0).toISOString();
    const end = new Date(2026, 9, 13, 0, 0).toISOString();
    assert.equal(coversDay(start, end, false, '2026-10-12'), true);
    assert.equal(coversDay(start, end, false, '2026-10-13'), false);
    const allDayStart = new Date(2026, 9, 12).toISOString();
    const allDayEnd = new Date(2026, 9, 14, 23, 59).toISOString();
    assert.equal(coversDay(allDayStart, allDayEnd, true, '2026-10-14'), true);
    assert.equal(coversDay(allDayStart, allDayEnd, true, '2026-10-15'), false);
  });
});

describe('Formular', () => {
  const range = {
    startDate: '2026-10-12',
    startTime: '08:00',
    endDate: '2026-10-12',
    endTime: '09:00',
  };

  it('Beginn nach dem Ende schiebt das Ende auf Beginn + 1 h', () => {
    assert.deepEqual(withStart(range, '2026-10-12', '10:00'), {
      startDate: '2026-10-12',
      startTime: '10:00',
      endDate: '2026-10-12',
      endTime: '11:00',
    });
    assert.deepEqual(withStart(range, '2026-10-12', '08:30').endTime, '09:00');
  });

  it('Ende vor dem Beginn schiebt den Beginn auf Ende − 1 h', () => {
    assert.deepEqual(withEnd(range, '2026-10-12', '07:30'), {
      startDate: '2026-10-12',
      startTime: '06:30',
      endDate: '2026-10-12',
      endTime: '07:30',
    });
  });

  it('ganztägig speichert 00:00 bis 23:59', () => {
    const stamps = toTimestamps({ ...range, endDate: '2026-10-13' }, true);
    assert.equal(stamps.startsAt, new Date(2026, 9, 12, 0, 0).toISOString());
    assert.equal(stamps.endsAt, new Date(2026, 9, 13, 23, 59).toISOString());
  });

  it('„Alle Termine“ verschiebt den Serienbeginn um die Änderung', () => {
    const shifted = shiftSeries(
      { startsAt: '2026-10-05T06:00:00.000Z' },
      '2026-10-19T06:00:00.000Z',
      { startsAt: '2026-10-19T07:00:00.000Z', endsAt: '2026-10-19T09:00:00.000Z' },
    );
    assert.deepEqual(shifted, {
      startsAt: '2026-10-05T07:00:00.000Z',
      endsAt: '2026-10-05T09:00:00.000Z',
    });
  });
});
