import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { archiveFailureReason, readFunctionErrorDetail } from './archiveError.ts';

describe('archiveFailureReason', () => {
  it('ohne Status: keine Verbindung', () => {
    assert.match(archiveFailureReason(undefined, null), /nicht erreichbar/);
  });

  it('Serverfehler mit technischer Meldung', () => {
    assert.equal(
      archiveFailureReason(500, 'storage upload failed: timeout'),
      'Der Server konnte das PDF nicht erzeugen. Technische Meldung: storage upload failed: timeout',
    );
  });

  it('Berechtigung und Anmeldung', () => {
    assert.match(archiveFailureReason(403, null), /Berechtigung/);
    assert.match(
      archiveFailureReason(401, ''),
      /^Die Anmeldung ist abgelaufen\. Bitte neu anmelden\.$/,
    );
  });
});

describe('readFunctionErrorDetail', () => {
  it('liest `error` aus dem JSON', async () => {
    const response = new Response(JSON.stringify({ ok: false, error: 'document not found' }), {
      status: 404,
    });
    assert.equal(await readFunctionErrorDetail(response), 'document not found');
  });

  it('kein JSON: null', async () => {
    assert.equal(await readFunctionErrorDetail(new Response('Bad Gateway', { status: 502 })), null);
  });
});
