import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readableDbError } from './dbErrors.ts';

describe('readableDbError – GoBD-Sperren', () => {
  it('übersetzt jede DOCUMENT_IMMUTABLE-Meldung der Trigger', () => {
    const messages = [
      'DOCUMENT_IMMUTABLE: festgeschriebener Beleg RE-00042 (status=paid) kann nicht geloescht werden, nur storniert',
      'DOCUMENT_IMMUTABLE: Positionen eines festgeschriebenen Belegs (status=issued) koennen nicht geaendert werden',
      'DOCUMENT_IMMUTABLE: festgeschriebener Beleg (status=sent) kann nur noch Status und erstmals Archivfelder aendern',
    ];
    for (const message of messages) {
      const text = readableDbError({ code: 'P0001', message });
      assert.ok(text?.includes('festgeschrieben'), message);
      assert.ok(!text?.includes('DOCUMENT_IMMUTABLE'));
    }
  });

  it('übersetzt den Festschreibe-Umweg', () => {
    const text = readableDbError({
      code: 'P0001',
      message:
        'DOCUMENT_FINALIZE_VIA_RPC: Belege werden ausschliesslich ueber finalize_sales_document festgeschrieben',
    });
    assert.ok(text?.includes('Freigeben'));
  });
});

describe('readableDbError – Löschkonzept WP3', () => {
  it('erkennt die Schreibsperre trotz 42501 und nennt nicht „fehlende Berechtigung“', () => {
    const text = readableDbError({
      code: '42501',
      message:
        'COMPANY_READ_ONLY: Betrieb 7f45e1b9-1785-4948-8b7b-c822efcd7584 ist gekündigt, Änderungen sind gesperrt',
    });
    assert.ok(text?.startsWith('Dein Betrieb ist gekündigt'), String(text));
  });
});
