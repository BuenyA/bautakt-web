import { describe, expect, it } from 'vitest';

import {
  documentTotals,
  eurosToMinor,
  parseMoneyInput,
  percentOf,
  roundHalfAwayFromZero,
  vatByRateGroups,
} from './money';

describe('roundHalfAwayFromZero', () => {
  it('rundet halbe Werte vom Nullpunkt weg — auch negative', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    // Math.round(-0.5) waere 0 — kaufmaennisch ist -1 richtig.
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it('macht aus Unlesbarem eine Null statt NaN', () => {
    expect(roundHalfAwayFromZero(Number.NaN)).toBe(0);
    expect(roundHalfAwayFromZero(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('vatByRateGroups', () => {
  it('rundet die USt einmal je Steuersatz, nicht je Zeile', () => {
    // Drei Zeilen zu 3,33 € brutto-relevantem Netto: je Zeile gerundet kaeme
    // 3 × 63 = 189 Cent heraus, korrekt ist 19 % von 999 = 190 Cent.
    const lines = [
      { netMinor: 333, taxRatePercent: 19 },
      { netMinor: 333, taxRatePercent: 19 },
      { netMinor: 333, taxRatePercent: 19 },
    ];

    const [group] = vatByRateGroups(lines);

    expect(group.netMinor).toBe(999);
    expect(group.vatMinor).toBe(190);
    expect(group.vatMinor).not.toBe(3 * percentOf(333, 19));
  });

  it('trennt Steuersaetze und sortiert sie aufsteigend', () => {
    const groups = vatByRateGroups([
      { netMinor: 10_000, taxRatePercent: 19 },
      { netMinor: 5_000, taxRatePercent: 7 },
      { netMinor: 1_000, taxRatePercent: 19 },
    ]);

    expect(groups.map((group) => group.rate)).toEqual([7, 19]);
    expect(groups[0]).toEqual({ rate: 7, netMinor: 5_000, vatMinor: 350 });
    expect(groups[1]).toEqual({ rate: 19, netMinor: 11_000, vatMinor: 2_090 });
  });
});

describe('documentTotals', () => {
  it('summiert Netto, USt und Brutto ueber alle Steuersaetze', () => {
    const totals = documentTotals([
      { netMinor: 100_000, taxRatePercent: 19 },
      { netMinor: 50_000, taxRatePercent: 7 },
    ]);

    expect(totals.netMinor).toBe(150_000);
    expect(totals.vatMinor).toBe(19_000 + 3_500);
    expect(totals.grossMinor).toBe(150_000 + 22_500);
  });
});

describe('eurosToMinor', () => {
  it('vertraegt, was PostgREST je nach Spalte liefert', () => {
    expect(eurosToMinor(12.34)).toBe(1234);
    expect(eurosToMinor('12.34')).toBe(1234);
    expect(eurosToMinor(null)).toBe(0);
    expect(eurosToMinor('')).toBe(0);
    expect(eurosToMinor('keine Zahl')).toBe(0);
  });

  it('rundet Fliesskomma-Ungenauigkeiten weg', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — daraus muessen 30 Cent werden.
    expect(eurosToMinor(0.1 + 0.2)).toBe(30);
  });
});

describe('parseMoneyInput', () => {
  it('liest deutsche Eingaben', () => {
    expect(parseMoneyInput('1.234,56')).toBe(123_456);
    expect(parseMoneyInput('1234,56')).toBe(123_456);
    expect(parseMoneyInput('1234.56')).toBe(123_456);
    expect(parseMoneyInput(' 12 ')).toBe(1_200);
  });

  it('gibt null zurueck, wenn nichts Brauchbares dasteht', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
  });
});
