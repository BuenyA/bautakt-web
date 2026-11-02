/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addAddress,
  addSender,
  capLowersMode,
  effectiveMailMode,
  inboundAddress,
  mailSettingsErrorKey,
  MAX_ALLOWLIST,
  MAX_INBOUND_SENDERS,
  rejectionReasonKey,
  removeAddress,
  sameSettings,
  selectableModes,
  sortAddresses,
  toMailMode,
} from './mailSettingsModel.ts';

describe('effectiveMailMode', () => {
  it('nimmt den niedrigeren Wert aus Betrieb und Obergrenze', () => {
    assert.equal(effectiveMailMode('allowlist', 'allowlist'), 'allowlist');
    assert.equal(effectiveMailMode('allowlist', 'dry_run'), 'dry_run');
    assert.equal(effectiveMailMode('live', 'allowlist'), 'allowlist');
    assert.equal(effectiveMailMode('live', 'live'), 'live');
    assert.equal(effectiveMailMode('dry_run', 'live'), 'dry_run');
  });

  it('fehlende oder unbekannte Obergrenze gilt als dry_run', () => {
    assert.equal(effectiveMailMode('allowlist', null), 'dry_run');
    assert.equal(effectiveMailMode('live', undefined), 'dry_run');
    assert.equal(effectiveMailMode('live', 'unbekannt'), 'dry_run');
  });

  it('unbekannter Modus des Betriebs gilt als dry_run', () => {
    assert.equal(effectiveMailMode('irgendwas', 'live'), 'dry_run');
    assert.equal(toMailMode(''), 'dry_run');
  });
});

describe('capLowersMode', () => {
  it('meldet nur, wenn die Obergrenze den Modus wirklich absenkt', () => {
    assert.equal(capLowersMode('allowlist', 'dry_run'), true);
    assert.equal(capLowersMode('live', 'allowlist'), true);
    assert.equal(capLowersMode('allowlist', 'allowlist'), false);
    assert.equal(capLowersMode('dry_run', 'dry_run'), false);
    assert.equal(capLowersMode('dry_run', null), false);
  });
});

describe('selectableModes', () => {
  it('ohne live nur dry_run und allowlist', () => {
    assert.deepEqual(selectableModes('dry_run'), ['dry_run', 'allowlist']);
    assert.deepEqual(selectableModes('allowlist'), ['dry_run', 'allowlist']);
  });

  it('steht der Betrieb auf live, bleibt live zum Halten wählbar', () => {
    assert.deepEqual(selectableModes('live'), ['dry_run', 'allowlist', 'live']);
  });
});

describe('addAddress', () => {
  it('normalisiert und sortiert nach Bytes wie die Datenbank', () => {
    const first = addAddress([], '  Bautakt+Test@Gmail.com ');
    assert.deepEqual(first, { ok: true, list: ['bautakt+test@gmail.com'] });
    const second = addAddress(['bautakt+test@gmail.com'], 'bautakt@gmail.com');
    assert.deepEqual(second, { ok: true, list: ['bautakt+test@gmail.com', 'bautakt@gmail.com'] });
  });

  it('lehnt Leeres, Ungültiges und Dubletten ab', () => {
    assert.deepEqual(addAddress([], '   '), { ok: false, reason: 'empty' });
    assert.deepEqual(addAddress([], 'kein-at.de'), { ok: false, reason: 'invalid' });
    assert.deepEqual(addAddress([], 'a@b'), { ok: false, reason: 'invalid' });
    assert.deepEqual(addAddress([], 'Name <a@b.de>'), { ok: false, reason: 'invalid' });
    assert.deepEqual(addAddress([], 'a@b.de, c@d.de'), { ok: false, reason: 'invalid' });
    assert.deepEqual(addAddress(['a@b.de'], 'A@B.de'), { ok: false, reason: 'duplicate' });
  });

  it('höchstens 50 Adressen', () => {
    const full = Array.from({ length: MAX_ALLOWLIST }, (_, i) => `t${i}@example.de`);
    assert.deepEqual(addAddress(full, 'neu@example.de'), { ok: false, reason: 'tooMany' });
    assert.equal(addAddress(full.slice(1), 'neu@example.de').ok, true);
  });
});

describe('removeAddress', () => {
  it('entfernt genau die Adresse', () => {
    assert.deepEqual(removeAddress(['a@b.de', 'c@d.de'], 'a@b.de'), ['c@d.de']);
    assert.deepEqual(removeAddress(['a@b.de'], 'x@y.de'), ['a@b.de']);
  });
});

describe('sortAddresses', () => {
  it('sortiert nach Bytes, „+“ vor „@“', () => {
    assert.deepEqual(sortAddresses(['bautakt@gmail.com', 'bautakt+test@gmail.com']), [
      'bautakt+test@gmail.com',
      'bautakt@gmail.com',
    ]);
  });
});

describe('sameSettings', () => {
  it('Reihenfolge der Adressen zählt nicht', () => {
    assert.equal(
      sameSettings(
        { mode: 'allowlist', allowlist: ['b@x.de', 'a@x.de'] },
        { mode: 'allowlist', allowlist: ['a@x.de', 'b@x.de'] },
      ),
      true,
    );
  });

  it('anderer Modus oder andere Adressen sind eine Änderung', () => {
    assert.equal(
      sameSettings({ mode: 'dry_run', allowlist: [] }, { mode: 'allowlist', allowlist: [] }),
      false,
    );
    assert.equal(
      sameSettings({ mode: 'dry_run', allowlist: ['a@x.de'] }, { mode: 'dry_run', allowlist: [] }),
      false,
    );
  });
});

describe('mailSettingsErrorKey', () => {
  it('übersetzt die Codes der RPCs', () => {
    assert.equal(mailSettingsErrorKey('forbidden'), 'forbidden');
    assert.equal(mailSettingsErrorKey('mail_mode_live_platform_only'), 'livePlatformOnly');
    assert.equal(mailSettingsErrorKey('mail_allowlist_invalid'), 'allowlistInvalid');
    assert.equal(mailSettingsErrorKey('mail_allowlist_too_long'), 'allowlistTooLong');
    assert.equal(mailSettingsErrorKey('mail_settings_not_saved'), 'notSaved');
    assert.equal(mailSettingsErrorKey('mail_mode_invalid'), 'notSaved');
  });

  it('Unbekanntes bleibt null', () => {
    assert.equal(mailSettingsErrorKey('etwas anderes'), null);
    assert.equal(mailSettingsErrorKey(null), null);
  });
});

describe('inboundAddress', () => {
  it('baut die Adresse aus dem Slug', () => {
    assert.equal(inboundAddress('muster-bau'), 'muster-bau@in.bautakt.com');
  });

  it('liefert ohne Slug keine Adresse', () => {
    assert.equal(inboundAddress(null), null);
    assert.equal(inboundAddress(undefined), null);
    assert.equal(inboundAddress(''), null);
  });
});

describe('addSender', () => {
  it('nimmt Adressen und Domains, klein geschrieben und sortiert', () => {
    assert.deepEqual(addSender(['z@example.com'], ' @Lieferant.DE '), {
      ok: true,
      list: ['@lieferant.de', 'z@example.com'],
    });
    assert.deepEqual(addSender([], 'Rechnung@Lieferant.de'), {
      ok: true,
      list: ['rechnung@lieferant.de'],
    });
  });

  it('lehnt Leeres, Ungültiges und Dubletten ab', () => {
    assert.deepEqual(addSender([], '  '), { ok: false, reason: 'empty' });
    for (const input of ['lieferant.de', '@lieferant', 'a@b@c.de', 'a b@c.de', 'a@c.de, b@c.de']) {
      assert.deepEqual(addSender([], input), { ok: false, reason: 'invalid' }, input);
    }
    assert.deepEqual(addSender(['@lieferant.de'], '@LIEFERANT.de'), {
      ok: false,
      reason: 'duplicate',
    });
  });

  it('begrenzt die Liste', () => {
    const full = Array.from({ length: MAX_INBOUND_SENDERS }, (_, i) => `a${i}@example.com`);
    assert.deepEqual(addSender(full, 'neu@example.com'), { ok: false, reason: 'tooMany' });
  });
});

describe('rejectionReasonKey', () => {
  it('kennt die Gründe, Unbekanntes wird other', () => {
    assert.equal(rejectionReasonKey('sender_limit'), 'senderLimit');
    assert.equal(rejectionReasonKey('sender_not_allowed'), 'senderNotAllowed');
    assert.equal(rejectionReasonKey('neu'), 'other');
  });
});

describe('mailSettingsErrorKey für die Freigabeliste', () => {
  it('erkennt die Codes der RPC', () => {
    assert.equal(mailSettingsErrorKey('inbound_senders_invalid'), 'sendersInvalid');
    assert.equal(mailSettingsErrorKey('inbound_senders_too_long'), 'sendersTooLong');
  });
});
