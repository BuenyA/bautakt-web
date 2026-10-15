/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectDeadlines,
  expiringExemptions,
  layoutLanes,
  mapsSearchUrl,
  newSince,
  recurrenceCoversDate,
} from './today.ts';

describe('recurrenceCoversDate', () => {
  it('kennt die vier Frequenzen der App', () => {
    assert.equal(recurrenceCoversDate('FREQ=DAILY;INTERVAL=1', '2026-10-01', '2026-10-11'), true);
    // 2026-10-05 und 2026-10-12 sind Montage
    assert.equal(recurrenceCoversDate('FREQ=WEEKLY;INTERVAL=1', '2026-10-05', '2026-10-12'), true);
    assert.equal(recurrenceCoversDate('FREQ=WEEKLY;INTERVAL=1', '2026-10-05', '2026-10-13'), false);
    assert.equal(recurrenceCoversDate('FREQ=MONTHLY;INTERVAL=1', '2026-01-11', '2026-10-11'), true);
    assert.equal(recurrenceCoversDate('FREQ=YEARLY;INTERVAL=1', '2020-10-11', '2026-10-11'), true);
    assert.equal(recurrenceCoversDate('FREQ=YEARLY;INTERVAL=1', '2020-11-11', '2026-10-11'), false);
  });

  it('beachtet Serienstart, UNTIL und fremde Intervalle', () => {
    assert.equal(recurrenceCoversDate('FREQ=DAILY', '2026-10-12', '2026-10-11'), false);
    assert.equal(
      recurrenceCoversDate('FREQ=DAILY;UNTIL=20261010', '2026-10-01', '2026-10-11'),
      false,
    );
    assert.equal(recurrenceCoversDate('FREQ=DAILY;INTERVAL=2', '2026-10-01', '2026-10-11'), false);
    assert.equal(recurrenceCoversDate('FREQ=HOURLY', '2026-10-01', '2026-10-11'), false);
  });
});

describe('layoutLanes', () => {
  it('legt Überlappende nebeneinander und Getrennte in eine Spalte', () => {
    const placed = layoutLanes([
      { id: 'a', start: 7, end: 15 },
      { id: 'b', start: 8, end: 12 },
      { id: 'c', start: 16, end: 17 },
    ]);
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]));
    assert.deepEqual([byId.a.lane, byId.a.lanes], [0, 2]);
    assert.deepEqual([byId.b.lane, byId.b.lanes], [1, 2]);
    assert.deepEqual([byId.c.lane, byId.c.lanes], [0, 1]);
  });
});

describe('newSince', () => {
  it('nimmt montags das Wochenende mit', () => {
    // Montag, 12.10.2026 → Freitag, 09.10.
    assert.equal(newSince(new Date(2026, 9, 12, 9)).getDate(), 9);
    // Mittwoch → Dienstag
    assert.equal(newSince(new Date(2026, 9, 14, 9)).getDate(), 13);
  });
});

describe('collectDeadlines', () => {
  const empty = { incoming: [], invoices: [], orders: [] };

  it('sortiert Überfälliges nach vorn und lässt Fernes weg', () => {
    const list = collectDeadlines(
      {
        ...empty,
        incoming: [
          {
            id: 'i1',
            vendor_name: 'Würth',
            invoice_number: '1',
            due_date: '2026-10-09',
            status: 'open',
            gross_total: 10,
          },
          {
            id: 'i2',
            vendor_name: 'Bezahlt',
            invoice_number: '2',
            due_date: '2026-10-09',
            status: 'paid',
            gross_total: 10,
          },
          {
            id: 'i3',
            vendor_name: 'Fern',
            invoice_number: '3',
            due_date: '2026-11-30',
            status: 'open',
            gross_total: 10,
          },
        ],
        orders: [{ id: 'o1', name: 'Bad Müller', end_date: '2026-10-11' }],
      },
      '2026-10-11',
    );
    assert.deepEqual(
      list.map((item) => [item.id, item.daysLeft]),
      [
        ['i1', -2],
        ['o1', 0],
      ],
    );
  });

  it('zeigt Ausgangsrechnungen nur mit künftiger Fälligkeit', () => {
    const list = collectDeadlines(
      {
        ...empty,
        invoices: [
          { id: 'alt', label: 'RE-1', due_date: '2026-10-01', amount: 5 },
          { id: 'bald', label: 'RE-2', due_date: '2026-10-13', amount: 5 },
        ],
      },
      '2026-10-11',
    );
    assert.deepEqual(
      list.map((item) => item.id),
      ['bald'],
    );
  });
});

describe('mapsSearchUrl', () => {
  it('kodiert die Adresse für die Google-Maps-Suche', () => {
    assert.equal(
      mapsSearchUrl(' Hauptstr. 4, 70173 Stuttgart '),
      'https://www.google.com/maps/search/?api=1&query=Hauptstr.%204%2C%2070173%20Stuttgart',
    );
  });
});

describe('expiringExemptions', () => {
  it('zaehlt je Subunternehmer nur die neueste Bescheinigung', () => {
    const list = expiringExemptions(
      [
        // Erneuert: die alte laeuft bald ab, die neue gilt noch lange.
        { contactId: 'a', name: 'Alt erneuert', validUntil: ['2026-10-20', '2027-12-31'] },
        { contactId: 'b', name: 'Bald', validUntil: ['2026-11-10'] },
        { contactId: 'c', name: 'Abgelaufen', validUntil: ['2026-10-01'] },
        { contactId: 'd', name: 'Ohne', validUntil: [] },
        { contactId: 'e', name: 'Spaeter', validUntil: ['2026-11-15'] },
      ],
      '2026-10-15',
    );
    assert.deepEqual(
      list.map((item) => [item.contactId, item.daysLeft]),
      [
        ['c', -14],
        ['b', 26],
      ],
    );
  });
});
