/**
 * Regeln der Mail-Einstellungen (#274), ohne React, damit sie testbar sind.
 *
 * Die Datenbank prüft dasselbe in `set_company_mail_settings` (bautakt-app
 * 20261101120000_b_mail_settings_rpc). Hier stehen die Regeln, damit der
 * Fehler am Feld erscheint statt als Datenbankmeldung. Verbindlich bleibt die
 * Datenbank.
 */

export const MAIL_MODES = ['dry_run', 'allowlist', 'live'] as const;
export type MailMode = (typeof MAIL_MODES)[number];

/** Domain des Mail-Eingangs, wie `INBOUND_DOMAIN` in `finance-inbound-mail`. */
export const INBOUND_DOMAIN = 'in.bautakt.com';

/** Empfangsadresse des Betriebs; `null`, solange er keinen Slug hat (#221). */
export const inboundAddress = (slug: string | null | undefined): string | null =>
  slug ? `${slug}@${INBOUND_DOMAIN}` : null;

/** Höchstens so viele Testadressen, wie eine Mail Empfänger haben darf. */
export const MAX_ALLOWLIST = 50;

/** Dieselbe Regel wie der CHECK an `reply_to_email` und die RPC. */
const ALLOWLIST_ADDRESS = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;

/** Unbekannte Werte gelten als `dry_run`, wie in `mail-send/policy.ts`. */
export const toMailMode = (value: string | null | undefined): MailMode =>
  value === 'allowlist' || value === 'live' ? value : 'dry_run';

/**
 * Wirksame Stufe: der niedrigere Wert aus Betrieb und Obergrenze. Fehlt die
 * Obergrenze, gilt `dry_run`. Wie `mail_effective_mode` in der Datenbank.
 */
export function effectiveMailMode(mode: string, cap: string | null | undefined): MailMode {
  const rank = (value: string | null | undefined) => {
    const index = MAIL_MODES.indexOf(value as MailMode);
    return index === -1 ? 0 : index;
  };
  return MAIL_MODES[Math.min(rank(mode), rank(cap))];
}

/** Senkt die Obergrenze den gewählten Modus ab? Dann braucht es den Hinweis. */
export const capLowersMode = (mode: string, cap: string | null | undefined) =>
  effectiveMailMode(mode, cap) !== toMailMode(mode);

/**
 * Modi, die der Owner auf der Seite wählen kann. `live` setzt nur die
 * Plattform; steht der Betrieb schon darauf, bleibt `live` wählbar, damit
 * der Owner ihn halten kann. Herabsetzen geht immer.
 */
export function selectableModes(stored: string): MailMode[] {
  return toMailMode(stored) === 'live'
    ? ['dry_run', 'allowlist', 'live']
    : ['dry_run', 'allowlist'];
}

/** Wie die RPC: getrimmt und klein geschrieben. */
export const normalizeAddress = (value: string) => value.trim().toLowerCase();

export type AddAddressResult =
  | { ok: true; list: string[] }
  | { ok: false; reason: 'empty' | 'invalid' | 'duplicate' | 'tooMany' };

/** Fügt eine Testadresse hinzu; die Liste bleibt sortiert wie in der Datenbank. */
export function addAddress(list: readonly string[], input: string): AddAddressResult {
  const address = normalizeAddress(input);
  if (!address) return { ok: false, reason: 'empty' };
  if (!ALLOWLIST_ADDRESS.test(address)) return { ok: false, reason: 'invalid' };
  if (list.includes(address)) return { ok: false, reason: 'duplicate' };
  if (list.length >= MAX_ALLOWLIST) return { ok: false, reason: 'tooMany' };
  return { ok: true, list: sortAddresses([...list, address]) };
}

export const removeAddress = (list: readonly string[], address: string) =>
  list.filter((entry) => entry !== address);

/**
 * Sortiert wie die RPC (`ORDER BY … COLLATE "C"`): nach Bytes, nicht nach
 * Sprache. Sonst meldet die Seite nach dem Speichern eine Änderung, die es
 * nicht gibt.
 */
export const sortAddresses = (list: readonly string[]) =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Gleicher Stand wie gespeichert? Reihenfolge zählt nicht. */
export function sameSettings(
  a: { mode: string; allowlist: readonly string[] },
  b: { mode: string; allowlist: readonly string[] },
): boolean {
  const left = sortAddresses(a.allowlist);
  const right = sortAddresses(b.allowlist);
  return (
    toMailMode(a.mode) === toMailMode(b.mode) &&
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

export type MailSettingsErrorKey =
  'forbidden' | 'livePlatformOnly' | 'allowlistInvalid' | 'allowlistTooLong' | 'notSaved';

/**
 * Fehlercodes der RPCs auf Textschlüssel. Unbekanntes gibt `null`; dann
 * zeigt die Seite die Originalmeldung statt einer erfundenen.
 */
export function mailSettingsErrorKey(
  message: string | null | undefined,
): MailSettingsErrorKey | null {
  const raw = message ?? '';
  if (/\bforbidden\b/.test(raw)) return 'forbidden';
  if (raw.includes('mail_mode_live_platform_only')) return 'livePlatformOnly';
  if (raw.includes('mail_allowlist_too_long')) return 'allowlistTooLong';
  if (raw.includes('mail_allowlist_invalid')) return 'allowlistInvalid';
  if (raw.includes('mail_settings_not_saved') || raw.includes('mail_mode_invalid'))
    return 'notSaved';
  return null;
}
