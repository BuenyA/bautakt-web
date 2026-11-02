/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  inboundFileErrorKey,
  type InboundFileRaw,
  resolvedInboundFile,
  splitInboundFiles,
} from './inboundReview.ts';

const raw = (over: Partial<InboundFileRaw> = {}): InboundFileRaw => ({
  id: 'a',
  file_name: 'agb.pdf',
  status: 'to_review',
  storage_path: 'c/incoming/a.pdf',
  created_at: '2026-11-02T10:00:00.000Z',
  inbound_mails: {
    from_email: 'lieferant@example.com',
    subject: 'Rechnung',
    received_at: '2026-11-02T09:00:00.000Z',
  },
  ...over,
});

describe('splitInboundFiles', () => {
  it('teilt nach Stand und lässt erfasste Dateien weg', () => {
    const lists = splitInboundFiles([
      raw({ id: 'offen' }),
      raw({ id: 'nein', status: 'not_invoice' }),
      raw({ id: 'erfasst', status: 'invoice' }),
    ]);
    assert.deepEqual(
      lists.toReview.map((file) => file.id),
      ['offen'],
    );
    assert.deepEqual(
      lists.notInvoice.map((file) => file.id),
      ['nein'],
    );
  });

  it('zeigt die neueste Mail zuerst und übernimmt die Mail-Daten', () => {
    const lists = splitInboundFiles([
      raw({ id: 'alt' }),
      raw({
        id: 'neu',
        inbound_mails: { from_email: null, subject: null, received_at: '2026-11-02T11:00:00.000Z' },
      }),
    ]);
    assert.deepEqual(
      lists.toReview.map((file) => file.id),
      ['neu', 'alt'],
    );
    assert.equal(lists.toReview[1].fromEmail, 'lieferant@example.com');
    assert.equal(lists.toReview[0].fromEmail, null);
  });

  it('nimmt ohne Mail-Daten den Zeitpunkt der Datei', () => {
    const { toReview } = splitInboundFiles([raw({ inbound_mails: null })]);
    assert.equal(toReview[0].receivedAt, '2026-11-02T10:00:00.000Z');
    assert.equal(toReview[0].subject, null);
  });
});

describe('resolvedInboundFile', () => {
  it('liest gültige Antworten', () => {
    assert.deepEqual(resolvedInboundFile({ status: 'invoice', invoice_id: 'x' }), {
      status: 'invoice',
      invoiceId: 'x',
    });
    assert.deepEqual(resolvedInboundFile({ status: 'not_invoice', invoice_id: null }), {
      status: 'not_invoice',
      invoiceId: null,
    });
  });

  it('wertet alles andere als nicht gespeichert', () => {
    for (const data of [null, 'x', {}, { status: 'invoice' }, { status: 'to_review' }]) {
      assert.equal(resolvedInboundFile(data), null);
    }
  });
});

describe('inboundFileErrorKey', () => {
  it('erkennt die Codes der RPC', () => {
    assert.equal(inboundFileErrorKey('forbidden'), 'forbidden');
    assert.equal(inboundFileErrorKey('inbound_file_already_invoice'), 'alreadyInvoice');
    assert.equal(inboundFileErrorKey('inbound_file_decision_invalid'), 'notSaved');
    assert.equal(inboundFileErrorKey('inbound_file_not_saved'), 'notSaved');
    assert.equal(inboundFileErrorKey('etwas anderes'), null);
    assert.equal(inboundFileErrorKey(null), null);
  });
});
