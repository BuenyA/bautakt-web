import { de } from 'date-fns/locale';
import { describe, expect, it } from 'vitest';

import {
  dateToIso,
  formatGermanDate,
  isEndBeforeStart,
  isoToLocalDate,
  maskGermanDate,
  maskTimeInput,
  parseGermanDate,
  parseIsoDay,
  parseTimeValue,
} from './date-time';

describe('parseIsoDay / formatGermanDate', () => {
  it('schreibt einen Kalendertag deutsch', () => {
    expect(formatGermanDate('2026-10-09')).toBe('09.10.2026');
    expect(formatGermanDate('2024-02-29')).toBe('29.02.2024');
  });

  it('lehnt Tage ab, die der Kalender nicht hat', () => {
    expect(parseIsoDay('2026-02-31')).toBeNull();
    expect(parseIsoDay('2026-02-29')).toBeNull();
    expect(parseIsoDay('2026-04-31')).toBeNull();
    expect(formatGermanDate('2026-02-31')).toBe('');
    expect(formatGermanDate('')).toBe('');
    expect(formatGermanDate(null)).toBe('');
  });

  it('behält den Kalendertag, den toISOString verschieben würde', () => {
    const local = new Date(2026, 9, 9);
    expect(dateToIso(local)).toBe('2026-10-09');
    expect(isoToLocalDate('2026-10-09')?.getFullYear()).toBe(2026);
    expect(isoToLocalDate('2026-10-09')?.getMonth()).toBe(9);
    expect(isoToLocalDate('2026-10-09')?.getDate()).toBe(9);
  });
});

describe('parseGermanDate', () => {
  it('ist die Umkehrung der Anzeige', () => {
    expect(parseGermanDate('09.10.2026')).toBe('2026-10-09');
    expect(parseGermanDate('9.10.2026')).toBe('2026-10-09');
    expect(parseGermanDate('29.02.2024')).toBe('2024-02-29');
  });

  it('meldet unmögliche Tage', () => {
    expect(parseGermanDate('31.02.2026')).toBeNull();
    expect(parseGermanDate('29.02.2026')).toBeNull();
    expect(parseGermanDate('31.04.2026')).toBeNull();
    expect(parseGermanDate('00.01.2026')).toBeNull();
    expect(parseGermanDate('32.01.2026')).toBeNull();
    expect(parseGermanDate('15.13.2026')).toBeNull();
    expect(parseGermanDate('15.00.2026')).toBeNull();
    expect(parseGermanDate('09.10')).toBeNull();
    expect(parseGermanDate('')).toBeNull();
  });
});

describe('maskGermanDate', () => {
  it('setzt die Punkte, während man tippt', () => {
    expect(maskGermanDate('09102026')).toBe('09.10.2026');
    expect(maskGermanDate('9.10.2026')).toBe('9.10.2026');
    expect(maskGermanDate('09.')).toBe('09.');
    expect(maskGermanDate('09.1')).toBe('09.1');
    expect(maskGermanDate('09.10.')).toBe('09.10.');
    expect(maskGermanDate('abc')).toBe('');
  });

  it('behält das Jahr, wenn die Punkte erst beim Tippen entstehen', () => {
    let text = '';
    for (const digit of '15082026') {
      text = maskGermanDate(text + digit);
    }
    expect(text).toBe('15.08.2026');
    expect(maskGermanDate('15082026')).toBe('15.08.2026');
    expect(maskGermanDate('15.082026')).toBe('15.08.2026');
    expect(maskGermanDate('150820269')).toBe('15.08.2026');
  });

  it('übersetzt einen eingefügten ISO-Tag', () => {
    expect(maskGermanDate('2026-10-09')).toBe('09.10.2026');
  });
});

describe('parseTimeValue / maskTimeInput', () => {
  it('normalisiert auf 24 Stunden', () => {
    expect(parseTimeValue('07:00')).toBe('07:00');
    expect(parseTimeValue('7:00')).toBe('07:00');
    expect(parseTimeValue('00:00')).toBe('00:00');
    expect(parseTimeValue('23:59')).toBe('23:59');
    expect(parseTimeValue('07:00:00')).toBe('07:00');
  });

  it('lehnt Uhrzeiten ab, die es nicht gibt', () => {
    expect(parseTimeValue('25:00')).toBeNull();
    expect(parseTimeValue('24:00')).toBeNull();
    expect(parseTimeValue('12:60')).toBeNull();
    expect(parseTimeValue('7:0')).toBeNull();
    expect(parseTimeValue('')).toBeNull();
  });

  it('setzt den Doppelpunkt, lässt Ungültiges aber sichtbar', () => {
    expect(maskTimeInput('0700')).toBe('07:00');
    expect(maskTimeInput('7:00')).toBe('7:00');
    expect(maskTimeInput('25:00')).toBe('25:00');
    expect(maskTimeInput('07:')).toBe('07:');
    expect(maskTimeInput('abc')).toBe('');
  });
});

describe('isEndBeforeStart', () => {
  it('lässt denselben Tag zu und lehnt ein früheres Ende ab', () => {
    expect(isEndBeforeStart('2026-10-10', '2026-10-09')).toBe(true);
    expect(isEndBeforeStart('2026-10-10', '2026-10-10')).toBe(false);
    expect(isEndBeforeStart('2026-10-10', '2026-10-11')).toBe(false);
  });

  it('wertet Lücken und unmögliche Tage nicht als Bereich', () => {
    expect(isEndBeforeStart('', '2026-10-10')).toBe(false);
    expect(isEndBeforeStart('2026-02-31', '2026-03-01')).toBe(false);
  });
});

describe('date-fns locale de', () => {
  it('beginnt die Woche am Montag', () => {
    expect(de.options?.weekStartsOn).toBe(1);
  });
});
