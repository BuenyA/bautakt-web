/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  currentEvidence,
  decidedAtIso,
  evidencePath,
  isConsumer,
  isInFuture,
  localDateTimeParts,
  needsEvidence,
  quoteEventDetail,
  quoteEventKey,
  selectableItems,
  toggleSelection,
} from './quoteDecision.ts';

const items = [
  { id: 'base', node_type: 'position', position_type: 'normal', alternative_to_id: null },
  { id: 'alt1', node_type: 'position', position_type: 'alternative', alternative_to_id: 'base' },
  { id: 'alt2', node_type: 'position', position_type: 'alternative', alternative_to_id: 'base' },
  { id: 'cont', node_type: 'position', position_type: 'contingency', alternative_to_id: null },
  { id: 'title', node_type: 'title', position_type: null, alternative_to_id: null },
];

describe('isConsumer', () => {
  it('Person ohne USt-IdNr. ist Verbraucher', () => {
    assert.equal(isConsumer({ kind: 'person', vat_id: '' }), true);
    assert.equal(isConsumer({ kind: 'person', vat_id: '  ' }), true);
    assert.equal(isConsumer({ kind: 'person' }), true);
  });

  it('Firma oder Person mit USt-IdNr. ist es nicht', () => {
    assert.equal(isConsumer({ kind: 'company', vat_id: '' }), false);
    assert.equal(isConsumer({ kind: 'person', vat_id: 'DE123456789' }), false);
    assert.equal(isConsumer(null), false);
  });
});

describe('Auswahl', () => {
  it('nur Alternativ- und Bedarfspositionen sind wählbar', () => {
    assert.deepEqual(
      selectableItems(items).map((item) => item.id),
      ['alt1', 'alt2', 'cont'],
    );
  });

  it('je Grundposition höchstens eine Alternative', () => {
    let selected = toggleSelection(items, new Set(), 'alt1');
    selected = toggleSelection(items, selected, 'cont');
    selected = toggleSelection(items, selected, 'alt2');
    assert.deepEqual([...selected].sort(), ['alt2', 'cont']);
  });

  it('erneutes Wählen hebt die Wahl auf', () => {
    const selected = toggleSelection(items, new Set(['cont']), 'cont');
    assert.equal(selected.size, 0);
  });
});

describe('Zeitpunkt', () => {
  it('Feldwerte ergeben einen ISO-Zeitpunkt in Ortszeit', () => {
    const now = new Date(2026, 10, 6, 9, 5);
    const parts = localDateTimeParts(now);
    assert.deepEqual(parts, { date: '2026-11-06', time: '09:05' });
    assert.equal(decidedAtIso(parts.date, parts.time), now.toISOString());
  });

  it('unvollständige Werte ergeben null', () => {
    assert.equal(decidedAtIso('', '09:00'), null);
    assert.equal(decidedAtIso('2026-11-06', '9'), null);
  });

  it('zehn Minuten Spiel für die Uhr wie in der Datenbank', () => {
    const now = new Date('2026-11-06T10:00:00Z');
    assert.equal(isInFuture('2026-11-06T10:09:00Z', now), false);
    assert.equal(isInFuture('2026-11-06T10:11:00Z', now), true);
  });
});

describe('Nachweis', () => {
  it('nur Unterschrift und Papier verlangen eine Datei', () => {
    assert.equal(needsEvidence('signature'), true);
    assert.equal(needsEvidence('paper'), true);
    assert.equal(needsEvidence('mail'), false);
    assert.equal(needsEvidence('verbal'), false);
  });

  it('Pfad liegt unter acceptance des Angebots', () => {
    assert.equal(evidencePath('c', 'q', 'f', 'image/png'), 'c/q/acceptance/f.png');
    assert.equal(evidencePath('c', 'q', 'f', 'application/pdf'), 'c/q/acceptance/f.pdf');
    assert.equal(evidencePath('c', 'q', 'f', 'text/html'), null);
  });

  it('nur der Nachweis der geltenden Entscheidung zählt', () => {
    const rows = [
      { id: 'neu', created_at: '2026-11-06T13:30:00.123456+00:00' },
      { id: 'alt', created_at: '2026-11-06T13:26:00.5+00:00' },
    ];
    assert.deepEqual(
      currentEvidence(rows, '2026-11-06T13:30:00.123456+00:00').map((row) => row.id),
      ['neu'],
    );
    assert.deepEqual(currentEvidence(rows, null), []);
  });
});

describe('Verlauf', () => {
  it('Probelauf und Zurücknahme', () => {
    assert.equal(quoteEventKey({ event_type: 'sent', payload: { mode: 'dry_run' } }), 'sentDryRun');
    assert.equal(quoteEventKey({ event_type: 'accepted', payload: {} }), 'accepted');
    assert.equal(
      quoteEventDetail({ event_type: 'decision_reverted', payload: { reason: 'Versehen' } }),
      'Versehen',
    );
    assert.equal(quoteEventDetail({ event_type: 'accepted', payload: { reason: 'x' } }), '');
  });
});
