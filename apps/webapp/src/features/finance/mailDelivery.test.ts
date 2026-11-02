import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type ArchivedMailStatus,
  type DeliveryStatusRaw,
  type MailDelivery,
  mailDelivery,
  type MailEventRow,
  openDeliveryProblems,
  openMailIssues,
  shouldPollDelivery,
  toDeliveryRows,
} from './mailDelivery.ts';

const CREATED = '2026-10-30T10:00:00.000Z';
const NOW = '2026-10-30T10:01:00.000Z';

function event(over: Partial<MailEventRow> & { kind: string; created_at: string }): MailEventRow {
  return { provider_message_id: null, error_code: null, ...over };
}

describe('mailDelivery', () => {
  it('versendet mit Message-ID und Zeitpunkt des Mail-Dienstes', () => {
    assert.deepEqual(
      mailDelivery(
        CREATED,
        [event({ kind: 'sent', provider_message_id: 'lm_1', created_at: '2026-10-30T10:00:01Z' })],
        NOW,
      ),
      { state: 'sent', at: '2026-10-30T10:00:01Z', providerMessageId: 'lm_1' },
    );
  });

  it('ein späteres sent gilt, auch nach Fehlversuchen', () => {
    const events = [
      event({ kind: 'sent', provider_message_id: 'lm_2', created_at: '2026-10-30T10:05:00Z' }),
      event({
        kind: 'failed',
        error_code: 'lettermint_http_500',
        created_at: '2026-10-30T10:00:01Z',
      }),
    ];
    assert.equal(mailDelivery(CREATED, events, NOW).state, 'sent');
  });

  it('der jüngste Fehlversuch zählt', () => {
    const events = [
      event({
        kind: 'failed',
        error_code: 'provider_outcome_unknown',
        created_at: '2026-10-30T10:00:01Z',
      }),
      event({
        kind: 'failed',
        error_code: 'lettermint_http_500',
        created_at: '2026-10-30T10:03:00Z',
      }),
    ];
    assert.deepEqual(mailDelivery(CREATED, events, NOW), {
      state: 'failed',
      at: '2026-10-30T10:03:00Z',
      errorCode: 'lettermint_http_500',
    });
    assert.deepEqual(mailDelivery(CREATED, events.slice(0, 1), NOW), {
      state: 'unknown',
      at: '2026-10-30T10:00:01Z',
    });
  });

  it('Probelauf', () => {
    assert.deepEqual(
      mailDelivery(CREATED, [event({ kind: 'dry_run', created_at: CREATED })], NOW),
      { state: 'dry_run', at: CREATED },
    );
  });

  it('ohne Ereignis: erst läuft der Versand, nach zehn Minuten ist er unklar', () => {
    assert.deepEqual(mailDelivery(CREATED, [], '2026-10-30T10:10:00.000Z'), { state: 'pending' });
    assert.deepEqual(mailDelivery(CREATED, [], '2026-10-30T10:10:00.001Z'), {
      state: 'unknown',
      at: CREATED,
    });
  });
});

function mail(id: string, createdAt: string, delivery: MailDelivery): ArchivedMailStatus {
  return { id, created_at: createdAt, delivery };
}

const SENT: MailDelivery = { state: 'sent', at: CREATED, providerMessageId: 'lm_1' };
const FAILED: MailDelivery = { state: 'failed', at: CREATED, errorCode: 'lettermint_http_500' };

describe('openMailIssues', () => {
  it('alles versendet und protokolliert: nichts offen', () => {
    assert.deepEqual(openMailIssues([mail('a', CREATED, SENT)], new Set(['a'])), []);
  });

  it('versendet ohne Protokolleintrag', () => {
    assert.deepEqual(openMailIssues([mail('a', CREATED, SENT)], new Set()), [
      { kind: 'unlogged', mailId: 'a' },
    ]);
  });

  it('Fehlversuch bleibt offen, bis danach eine Mail rausging', () => {
    const failed = mail('a', '2026-10-30T10:00:00Z', FAILED);
    const unknown = mail('b', '2026-10-30T10:01:00Z', { state: 'unknown', at: CREATED });
    assert.deepEqual(openMailIssues([unknown, failed], new Set()), [
      { kind: 'failed', mailId: 'a' },
      { kind: 'unknown', mailId: 'b' },
    ]);
    const resent = mail('c', '2026-10-30T10:02:00Z', SENT);
    assert.deepEqual(openMailIssues([failed, unknown, resent], new Set(['c'])), []);
  });

  it('ein Fehlversuch nach dem Versand bleibt offen; Probelauf und laufender Versand nicht', () => {
    const sent = mail('a', '2026-10-30T10:00:00Z', SENT);
    const failed = mail('b', '2026-10-30T10:05:00Z', FAILED);
    const dry = mail('c', '2026-10-30T10:06:00Z', { state: 'dry_run', at: CREATED });
    const pending = mail('d', '2026-10-30T10:07:00Z', { state: 'pending' });
    assert.deepEqual(openMailIssues([sent, failed, dry, pending], new Set(['a'])), [
      { kind: 'failed', mailId: 'b' },
    ]);
  });
});

describe('Zustellstatus (#276)', () => {
  const raw = (over: Partial<DeliveryStatusRaw>): DeliveryStatusRaw => ({
    mail_id: 'm1',
    sent_at: '2026-11-02T12:00:00.000Z',
    status: 'sent',
    recipients_total: 1,
    recipients_delivered: 0,
    status_at: null,
    problem_recipient: null,
    problem_code: null,
    problem_message: null,
    ...over,
  });

  it('übersetzt Zeilen, älteste zuerst, Zeitpunkt fällt auf den Versand zurück', () => {
    const rows = toDeliveryRows([
      raw({
        mail_id: 'neu',
        sent_at: '2026-11-02T13:00:00.000Z',
        status: 'delivered',
        status_at: '2026-11-02T13:00:05.000Z',
        recipients_delivered: 1,
      }),
      raw({ mail_id: 'alt' }),
    ]);
    assert.deepEqual(
      rows.map((row) => [row.mailId, row.status, row.at]),
      [
        ['alt', 'sent', '2026-11-02T12:00:00.000Z'],
        ['neu', 'delivered', '2026-11-02T13:00:05.000Z'],
      ],
    );
  });

  it('unbekannter Status gilt nie als zugestellt, Zeilen ohne ID fallen weg', () => {
    assert.equal(toDeliveryRows([raw({ status: 'irgendwas' })])[0]!.status, 'sent');
    assert.equal(toDeliveryRows([raw({ status: null })])[0]!.status, 'sent');
    assert.deepEqual(toDeliveryRows([raw({ mail_id: null })]), []);
  });

  it('setzt den Grund aus Code und Text zusammen', () => {
    const reason = (over: Partial<DeliveryStatusRaw>) =>
      toDeliveryRows([raw(over)])[0]!.problemReason;
    assert.equal(
      reason({ problem_code: '5.1.1', problem_message: 'User unknown' }),
      '5.1.1: User unknown',
    );
    assert.equal(reason({ problem_code: '5.1.1' }), '5.1.1');
    assert.equal(reason({}), null);
  });

  it('unzustellbar erledigt sich erst durch eine spätere zugestellte Mail', () => {
    const bounce = raw({ mail_id: 'b', status: 'undeliverable' });
    const ok = (at: string) => raw({ mail_id: 'ok', status: 'delivered', sent_at: at });
    const ids = (rows: DeliveryStatusRaw[]) =>
      openDeliveryProblems(toDeliveryRows(rows)).map((row) => row.mailId);
    assert.deepEqual(ids([bounce]), ['b']);
    assert.deepEqual(ids([bounce, ok('2026-11-02T11:00:00.000Z')]), ['b']);
    assert.deepEqual(ids([bounce, ok('2026-11-02T13:00:00.000Z')]), []);
    assert.deepEqual(
      ids([bounce, raw({ mail_id: 'x', status: 'sent', sent_at: '2026-11-02T13:00:00.000Z' })]),
      ['b'],
    );
  });

  it('eine Spam-Beschwerde bleibt offen', () => {
    const rows = toDeliveryRows([
      raw({ mail_id: 'c', status: 'complained' }),
      raw({ mail_id: 'ok', status: 'delivered', sent_at: '2026-11-02T13:00:00.000Z' }),
    ]);
    assert.deepEqual(
      openDeliveryProblems(rows).map((row) => row.mailId),
      ['c'],
    );
  });

  it('lädt nur offene Mails kurz nach dem Versand nach', () => {
    const rows = (status: string) => toDeliveryRows([raw({ status })]);
    const soon = '2026-11-02T12:14:00.000Z';
    const late = '2026-11-02T12:16:00.000Z';
    assert.equal(shouldPollDelivery(rows('sent'), soon), true);
    assert.equal(shouldPollDelivery(rows('deferred'), soon), true);
    assert.equal(shouldPollDelivery(rows('sent'), late), false);
    assert.equal(shouldPollDelivery(rows('delivered'), soon), false);
    assert.equal(shouldPollDelivery([], soon), false);
  });
});
