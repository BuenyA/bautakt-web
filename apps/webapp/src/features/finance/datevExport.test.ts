/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  monthOptions,
  monthValue,
  parseMonthValue,
  previousMonth,
  readCheckResponse,
  readExportResponse,
} from './datevExport.ts';

describe('Monatsauswahl', () => {
  it('Vorgabe ist der Vormonat, im Januar der Dezember des Vorjahrs', () => {
    assert.deepEqual(previousMonth('2026-10-27'), { year: 2026, month: 9 });
    assert.deepEqual(previousMonth('2027-01-03'), { year: 2026, month: 12 });
  });

  it('laufender Monat zuerst, über den Jahreswechsel', () => {
    assert.deepEqual(monthOptions('2027-02-10', 4).map(monthValue), [
      '2027-02',
      '2027-01',
      '2026-12',
      '2026-11',
    ]);
  });

  it('Wert lesen', () => {
    assert.deepEqual(parseMonthValue('2026-09'), { year: 2026, month: 9 });
    assert.equal(parseMonthValue('2026-13'), null);
    assert.equal(parseMonthValue('2026-9'), null);
  });
});

describe('Antwort von datev-export', () => {
  const csv = Buffer.from('"EXTF";700', 'latin1').toString('base64');

  it('200 mit Datei: Bytes unverändert, Warnungen bleiben', () => {
    const outcome = readExportResponse(200, {
      ok: true,
      bookings: 3,
      file_name: 'EXTF_Buchungsstapel_Ausgang_2026-10.csv',
      content_base64: csv,
      findings: [
        { code: 'collective_debtor', severity: 'warning', document: 'RE00011', value: '69999' },
      ],
    });
    assert.equal(outcome.kind, 'file');
    if (outcome.kind !== 'file') return;
    assert.equal(outcome.fileName, 'EXTF_Buchungsstapel_Ausgang_2026-10.csv');
    assert.deepEqual([...outcome.bytes], [...Buffer.from('"EXTF";700', 'latin1')]);
    assert.deepEqual(outcome.findings, [
      { code: 'collective_debtor', severity: 'warning', document: 'RE00011', value: '69999' },
    ]);
  });

  it('200 ohne Belege: kein Download', () => {
    const outcome = readExportResponse(200, {
      ok: true,
      bookings: 0,
      file_name: null,
      content_base64: null,
      findings: [],
    });
    assert.deepEqual(outcome, { kind: 'empty', findings: [] });
  });

  it('422: Befunde ohne Datei', () => {
    const outcome = readExportResponse(422, {
      error: 'export_blocked',
      findings: [{ code: 'numbers_missing', severity: 'error' }],
    });
    assert.deepEqual(outcome, {
      kind: 'blocked',
      findings: [{ code: 'numbers_missing', severity: 'error' }],
    });
  });

  it('Anmeldung und Berechtigung getrennt, alles andere unbekannt', () => {
    assert.deepEqual(readExportResponse(401, null), { kind: 'failed', reason: 'auth' });
    assert.deepEqual(readExportResponse(403, { error: 'forbidden' }), {
      kind: 'failed',
      reason: 'forbidden',
    });
    assert.deepEqual(readExportResponse(500, { error: 'internal_error' }), {
      kind: 'failed',
      reason: 'unknown',
    });
  });

  it('kaputte 200 und unbekannte Befunde werden nicht still durchgereicht', () => {
    assert.equal(readExportResponse(200, { ok: true, bookings: 2, findings: [] }).kind, 'failed');
    assert.equal(
      readExportResponse(200, {
        ok: true,
        bookings: 1,
        file_name: 'x.csv',
        content_base64: csv,
        findings: [{ code: 'neu', severity: 'warning' }],
      }).kind,
      'failed',
    );
  });
});

describe('Prüfung vor dem Download', () => {
  it('importierbar mit Warnungen', () => {
    assert.deepEqual(
      readCheckResponse(200, {
        ok: true,
        check_only: true,
        importable: true,
        bookings: 2,
        findings: [
          { code: 'chars_replaced', severity: 'warning', document: 'RE00002', value: 'Ł' },
        ],
      }),
      {
        kind: 'checked',
        importable: true,
        bookings: 2,
        findings: [
          { code: 'chars_replaced', severity: 'warning', document: 'RE00002', value: 'Ł' },
        ],
      },
    );
  });

  it('nicht importierbar bleibt eine Prüfung, kein Fehler', () => {
    const outcome = readCheckResponse(200, {
      ok: true,
      check_only: true,
      importable: false,
      bookings: 0,
      findings: [{ code: 'debtor_missing', severity: 'error', document: 'RE00003' }],
    });
    assert.equal(outcome.kind, 'checked');
    assert.equal(outcome.kind === 'checked' && outcome.importable, false);
  });

  it('Antwort ohne check_only (alte Function) gilt als Fehler', () => {
    assert.deepEqual(readCheckResponse(200, { ok: true, bookings: 2, findings: [] }), {
      kind: 'failed',
      reason: 'unknown',
    });
    assert.deepEqual(readCheckResponse(403, {}), { kind: 'failed', reason: 'forbidden' });
  });
});
