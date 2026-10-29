/**
 * Prüfsumme des Originals einer Eingangsrechnung (bautakt-web#163).
 *
 * `finance-inbound-store` legt beim Hochladen den SHA-256 der Datei als
 * `content_hash` ab (Hex, klein). Wer das Original herunterlädt, bekommt nur
 * Bytes, die genau diese Prüfsumme haben -- sonst gar nichts. Die Prüfsumme
 * steht sichtbar daneben, damit sie sich außerhalb von Bautakt nachrechnen
 * lässt (`sha256sum`, `Get-FileHash`).
 */

/** SHA-256 als Hex-String in Kleinbuchstaben, wie in `content_hash`. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class OriginalHashMismatch extends Error {
  constructor() {
    super('ORIGINAL_HASH_MISMATCH');
    this.name = 'OriginalHashMismatch';
  }
}

/**
 * Die Bytes nur zurückgeben, wenn sie zur abgelegten Prüfsumme passen. Ohne
 * Prüfsumme (Beleg aus der Zeit vor #161) gibt es nichts zu vergleichen; das
 * Original geht dann ungeprüft hinaus, und `verified` sagt das.
 */
export async function checkOriginal(
  bytes: Uint8Array,
  contentHash: string | null,
): Promise<{ bytes: Uint8Array; hash: string; verified: boolean }> {
  const hash = await sha256Hex(bytes);
  if (!contentHash) return { bytes, hash, verified: false };
  if (hash !== contentHash.trim().toLowerCase()) throw new OriginalHashMismatch();
  return { bytes, hash, verified: true };
}
