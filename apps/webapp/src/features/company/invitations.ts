/**
 * Einladung annehmen — wie `bautakt-app` `app/lib/supabase/invitations.ts`.
 *
 * Der QR-Code der App traegt `bautakt://invite/<token>`; der Code zum
 * Abtippen ist derselbe Token, in Vierergruppen angezeigt. Beides landet hier.
 * Wer die Erkennung aendert, aendert sie dort mit, sonst nimmt das Web Codes
 * an, die die App ablehnt, oder umgekehrt.
 *
 * `accept_employment_invitation` legt die Beschaeftigung serverseitig an
 * (SECURITY DEFINER, nur `authenticated`). Die Rolle kommt aus der Einladung,
 * nie aus dem Client.
 */

const INVITATION_TOKEN_LENGTH = 16;

/** Token aus einem Link, QR-Inhalt oder getippten Code — sonst `null`. */
export function extractInviteToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/invite\/([a-f0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1].toLowerCase();

  const normalized = trimmed.replace(/[\s-]/g, '');
  if (/^[a-f0-9]{16}$/i.test(normalized)) return normalized.toLowerCase();
  if (/^[a-f0-9]{24}$/i.test(normalized)) return normalized.toLowerCase();
  if (/^[a-f0-9]{48}$/i.test(normalized)) return normalized.toLowerCase();

  return null;
}

/** Aktuelle Einladungen haben 16 Zeichen; das Feld gibt erst dann frei. */
export function isCurrentInvitationToken(token: string): boolean {
  return token.replace(/[\s-]/g, '').length === INVITATION_TOKEN_LENGTH;
}

/** Fehlercodes der RPC. Sie sind Protokoll und bleiben unuebersetzt. */
export const INVITATION_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'INVITATION_NOT_FOUND',
  'INVITATION_INACTIVE',
  'INVITATION_EXPIRED',
  'INVITATION_DEPLETED',
  'ALREADY_MEMBER',
  'NAME_REQUIRED',
] as const;

export type InvitationErrorCode = (typeof INVITATION_ERROR_CODES)[number];

/** i18n-Key zur Fehlermeldung der RPC; Unbekanntes wird `errors:generic`. */
export function invitationErrorKey(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';
  const code = INVITATION_ERROR_CODES.find((candidate) => message.includes(candidate));
  return code ? `errors:invitation.${code}` : 'errors:generic';
}
