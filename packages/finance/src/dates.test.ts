import { describe, expect, it } from 'vitest';

import { daysBetween, daysOverdue, formatIsoDateDe, parseIsoDate, toIsoDate } from './dates';

describe('toIsoDate', () => {
  it('haelt den Kalendertag fest, den toISOString verschieben wuerde', () => {
    // 01.09.2026, lokale Mitternacht. In Deutschland (MESZ) liefert
    // toISOString() '2026-08-31T22:00:00.000Z' — also den Vortag.
    const localMidnight = new Date(2026, 8, 1);

    expect(toIsoDate(localMidnight)).toBe('2026-09-01');
  });

  it('ist die Umkehrung von parseIsoDate', () => {
    expect(toIsoDate(parseIsoDate('2026-02-29'))).toBe('2026-03-01'); // 2026 ist kein Schaltjahr
    expect(toIsoDate(parseIsoDate('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('formatIsoDateDe', () => {
  it('schreibt den Tag deutsch', () => {
    expect(formatIsoDateDe('2026-09-23')).toBe('23.09.2026');
  });

  it('bleibt bei Unvollstaendigem leer statt zu raten', () => {
    expect(formatIsoDateDe(null)).toBe('');
    expect(formatIsoDateDe('2026-09')).toBe('');
  });
});

describe('daysBetween', () => {
  it('zaehlt volle Tage', () => {
    expect(daysBetween('2026-09-01', '2026-09-08')).toBe(7);
    expect(daysBetween('2026-09-08', '2026-09-01')).toBe(-7);
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('bleibt ueber die Sommerzeitumstellung hinweg richtig', () => {
    // In der Nacht zum 25.10.2026 wird auf Winterzeit umgestellt: der Tag hat
    // 25 Stunden. Ohne Normierung auf Mittag zaehlt eine reine Millisekunden-
    // Differenz hier einen Tag zu wenig.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    // Und zurueck auf Sommerzeit (29.03.2026, 23 Stunden).
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('daysOverdue', () => {
  it('zaehlt nur Ueberfaelligkeit, nie Vorlauf', () => {
    expect(daysOverdue('2026-09-01', '2026-09-10')).toBe(9);
    expect(daysOverdue('2026-09-30', '2026-09-10')).toBe(0);
    expect(daysOverdue(null, '2026-09-10')).toBe(0);
  });
});
