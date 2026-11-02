import type { Tables } from '@bautakt/supabase';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

/**
 * Was die Oberfläche aus `company_mail_settings` liest (#220). Token und
 * Projekt-ID bleiben beim Mail-Adapter.
 */
export type MailSettings = Pick<
  Tables<'company_mail_settings'>,
  | 'reply_to_email'
  | 'inbound_slug'
  | 'mail_mode'
  | 'test_recipient_allowlist'
  | 'send_limit_per_hour'
  | 'send_limit_per_day'
>;

export type { MailMode } from '@/features/companySettings/mailSettingsModel';

/**
 * Mail-Einstellungen des eigenen Betriebs; `null`, solange es für ihn keine
 * Zeile gibt. Ohne Zeile versendet der Adapter nicht.
 */
export function useMailSettings() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-mail-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<MailSettings | null> => {
      const { data, error } = await supabase
        .from('company_mail_settings')
        .select(
          'reply_to_email, inbound_slug, mail_mode, test_recipient_allowlist, send_limit_per_hour, send_limit_per_day',
        )
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Wie `resolveSender` im Adapter: eigenes Reply-To, sonst die Firmen-Mail. */
export function effectiveReplyTo(
  settings: MailSettings | null | undefined,
  companyEmail: string | null | undefined,
): string {
  return (settings?.reply_to_email ?? companyEmail ?? '').trim();
}

/**
 * Modus, Testadressen, Obergrenze und wirksame Stufe (#274) über
 * `get_company_mail_settings`. Die Obergrenze liegt in einer Tabelle ohne
 * Clientrechte; nur die RPC gibt sie heraus. `null`, wenn der Betrieb keine
 * Zeile hat.
 */
export type MailModeState = {
  mailMode: string;
  allowlist: string[];
  /** `null`, wenn die Plattform-Einstellung fehlt; dann gilt dry_run. */
  modeCap: string | null;
  effectiveMode: string;
};

type MailModeRow = {
  mail_mode: string;
  test_recipient_allowlist: string[];
  mode_cap: string | null;
  effective_mode: string;
};

export const toMailModeState = (row: MailModeRow): MailModeState => ({
  mailMode: row.mail_mode,
  allowlist: row.test_recipient_allowlist ?? [],
  modeCap: row.mode_cap ?? null,
  effectiveMode: row.effective_mode,
});

export const mailModeQueryKey = (companyId: string | undefined) => ['company-mail-mode', companyId];

export function useMailModeState() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: mailModeQueryKey(companyId),
    enabled: Boolean(companyId),
    queryFn: async (): Promise<MailModeState | null> => {
      const { data, error } = await supabase.rpc('get_company_mail_settings', {
        p_company_id: companyId!,
      });
      if (error) throw error;
      const row = data?.[0];
      return row ? toMailModeState(row) : null;
    },
  });
}

export type MailSettingsLogEntry = {
  id: string;
  changedAt: string;
  /** Leer, wenn die Person nicht mehr im Betrieb ist. */
  changedByName: string;
  oldMode: string;
  newMode: string;
  oldAllowlist: string[];
  newAllowlist: string[];
};

/** Wie viele Einträge die Seite zeigt; ältere bleiben in der Datenbank. */
export const MAIL_SETTINGS_LOG_LIMIT = 50;

export const mailSettingsLogQueryKey = (companyId: string | undefined) => [
  'company-mail-settings-log',
  companyId,
];

/**
 * Änderungsprotokoll, neueste zuerst. RLS gibt es nur dem Owner heraus;
 * `enabled` steuert, dass andere die Abfrage gar nicht erst stellen.
 */
export function useMailSettingsLog(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: mailSettingsLogQueryKey(companyId),
    enabled: enabled && Boolean(companyId),
    queryFn: async (): Promise<MailSettingsLogEntry[]> => {
      const { data, error } = await supabase
        .from('company_mail_settings_log')
        .select(
          'id, changed_at, changed_by, old_mail_mode, new_mail_mode, old_allowlist, new_allowlist',
        )
        .eq('company_id', companyId!)
        .order('changed_at', { ascending: false })
        .limit(MAIL_SETTINGS_LOG_LIMIT);
      if (error) throw error;
      const rows = data ?? [];

      // `changed_by` ist die Nutzer-Id ohne Fremdschlüssel; der Name kommt
      // aus der Beschäftigung im eigenen Betrieb.
      const userIds = [...new Set(rows.map((row) => row.changed_by))];
      const names = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: people, error: peopleError } = await supabase
          .from('employments')
          .select('user_id, display_first_name, display_last_name, profiles(first_name, last_name)')
          .eq('company_id', companyId!)
          .in('user_id', userIds);
        if (peopleError) throw peopleError;
        for (const person of people ?? []) {
          if (person.user_id && !names.get(person.user_id)) {
            names.set(person.user_id, employmentDisplayName(person));
          }
        }
      }

      return rows.map((row) => ({
        id: row.id,
        changedAt: row.changed_at,
        changedByName: names.get(row.changed_by) ?? '',
        oldMode: row.old_mail_mode,
        newMode: row.new_mail_mode,
        oldAllowlist: row.old_allowlist,
        newAllowlist: row.new_allowlist,
      }));
    },
  });
}
