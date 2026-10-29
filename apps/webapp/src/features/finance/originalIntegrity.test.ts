import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkOriginal, OriginalHashMismatch, sha256Hex } from './originalIntegrity.ts';

const ABC = new TextEncoder().encode('abc');
// NIST-Testvektor für SHA-256("abc").
const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('Prüfsumme des Originals', () => {
  it('SHA-256 als Hex in Kleinbuchstaben', async () => {
    assert.equal(await sha256Hex(ABC), ABC_HASH);
    assert.equal(
      await sha256Hex(new Uint8Array()),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('passende Prüfsumme: Bytes unverändert, geprüft', async () => {
    const result = await checkOriginal(ABC, ABC_HASH);
    assert.equal(result.verified, true);
    assert.equal(result.hash, ABC_HASH);
    assert.deepEqual(result.bytes, ABC);
  });

  it('Großbuchstaben und Leerraum in der abgelegten Prüfsumme stören nicht', async () => {
    const result = await checkOriginal(ABC, ` ${ABC_HASH.toUpperCase()}\n`);
    assert.equal(result.verified, true);
  });

  it('ein verändertes Byte fällt auf', async () => {
    const changed = new TextEncoder().encode('abd');
    await assert.rejects(checkOriginal(changed, ABC_HASH), OriginalHashMismatch);
  });

  it('ohne abgelegte Prüfsumme: Hash berechnet, aber nicht als geprüft gemeldet', async () => {
    const result = await checkOriginal(ABC, null);
    assert.equal(result.verified, false);
    assert.equal(result.hash, ABC_HASH);
  });
});
