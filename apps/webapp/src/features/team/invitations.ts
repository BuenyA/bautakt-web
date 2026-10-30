import { supabase } from '@/lib/supabase';

/**
 * Einladungen in den Betrieb — dieselben RPCs wie die Handy-App
 * (`bautakt-app/app/lib/supabase/invitations.ts`).
 *
 * Zwei Wege: Der QR-Code ist 7 Tage gültig und mehrfach nutzbar, der Code
 * 7 Tage und genau einmal (`max_uses` setzt `create_employment_invitation`).
 * Angenommen wird immer in der App (`accept_employment_invitation`), nie hier.
 */
export type InvitationMethod = 'qr' | 'token';

export type EmploymentInvitation = {
  id: string;
  token: string;
  expiresAt: string;
  role: string;
};

/**
 * Muss zu `expo.scheme` der App passen. Der Scanner der App liest den Token
 * schemaunabhängig aus allem, was `invite/<hex>` enthält.
 */
const INVITE_APP_SCHEME = 'bautakt://invite';

export function inviteAppUrl(token: string): string {
  return `${INVITE_APP_SCHEME}/${token}`;
}

/** In Vierergruppen, wie die App ihn anzeigt — eingegeben wird er mit oder ohne Leerzeichen. */
export function formatInvitationToken(token: string): string {
  const clean = token.replace(/[\s-]/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') ?? token;
}

type InvitationRow = {
  id: string;
  token: string;
  expires_at: string;
  role: string;
  max_uses?: number | null;
  use_count?: number;
};

function toInvitation(row: InvitationRow): EmploymentInvitation {
  return { id: row.id, token: row.token, expiresAt: row.expires_at, role: row.role };
}

async function fetchActiveInvitation(
  companyId: string,
  method: InvitationMethod,
): Promise<EmploymentInvitation | null> {
  const { data, error } = await supabase
    .from('employment_invitations')
    .select('id, token, expires_at, role, max_uses, use_count')
    .eq('company_id', companyId)
    .eq('delivery_method', method)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;

  const usable = (data ?? []).find((row) => row.max_uses == null || row.use_count < row.max_uses);
  return usable ? toInvitation(usable) : null;
}

async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_employment_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
}

async function createInvitation(
  method: InvitationMethod,
  role: string,
): Promise<EmploymentInvitation> {
  const { data, error } = await supabase.rpc('create_employment_invitation', {
    p_delivery_method: method,
    p_role: role,
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error('INVITATION_CREATE_FAILED');
  return toInvitation(row);
}

/**
 * Die gültige Einladung dieses Wegs für diese Rolle — oder eine neue.
 *
 * Je Weg gibt es höchstens eine aktive Einladung: Passt die Rolle nicht oder
 * wird neu generiert, wird die alte widerrufen, damit ein schon verschickter
 * Code mit falscher Rolle nicht mehr greift.
 *
 * Anders als die App prüft das Web nicht die Tokenlänge: Die App erwartet 16
 * Zeichen, die Datenbank erzeugt seit `20260809115703` aber 48 — die App
 * erneuert deshalb bei jedem Öffnen.
 */
export async function getOrCreateInvitation(
  companyId: string,
  method: InvitationMethod,
  role: string,
  forceNew: boolean,
): Promise<EmploymentInvitation> {
  const existing = await fetchActiveInvitation(companyId, method);
  if (!forceNew && existing && existing.role === role) return existing;
  if (existing) await revokeInvitation(existing.id);
  return createInvitation(method, role);
}
