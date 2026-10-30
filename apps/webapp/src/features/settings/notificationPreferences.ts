import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Benachrichtigungs-Einstellungen je Nutzer und Betrieb — dieselbe Zeile wie
 * in der App (`notification_preferences`, Modell aus
 * `bautakt-app/app/lib/notificationPreferencesStorage.ts`).
 *
 * Die Zeile entsteht erst, wenn jemand etwas verstellt; fehlt sie, gelten die
 * Standardwerte. Geschrieben wird immer die ganze Zeile (Upsert), wie in der
 * App.
 */
export type NotificationPreferences = {
  briefingEnabled: boolean;
  /** `HH:MM`, Viertelstunden (CHECK-Constraint in der Datenbank). */
  briefingTime: string;
  /** Abweichungen vom Rollen-Standard; hier nur durchgereicht, nicht bearbeitet. */
  briefingBlocks: Record<string, boolean>;
  /** Typkennungen, nicht Kategorien. */
  mutedTypes: string[];
  quietHoursEnabled: boolean;
  timezone: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  briefingEnabled: true,
  briefingTime: '06:30',
  briefingBlocks: {},
  mutedTypes: [],
  quietHoursEnabled: true,
  timezone: 'Europe/Berlin',
};

/**
 * Schaltgruppen und ihre Typen, Reihenfolge wie in der App
 * (`bautakt-app/app/lib/notifications/notificationTypes.ts`). Ein neuer Typ
 * dort gehört auch hier eingetragen; `muted_types` speichert die Typen.
 */
export const NOTIFICATION_CATEGORIES = {
  team: ['company.broadcast'],
  schedule: ['workAssignment.assigned'],
  todos: ['checklistItem.assigned', 'todo.due', 'todo.overdue'],
  orders: ['orderIssue.reported'],
  absence: ['absence.requested', 'absence.decided'],
  finance: [
    'dunning.sent',
    'invoice.overdue',
    'invoice.dunningDue',
    'incomingInvoice.dueSoon',
    'contact.bankAccountChanged',
    'exemption.expiringSoon',
  ],
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

export const CATEGORY_ORDER = Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[];

/**
 * Eine Kategorie ist an, solange einer ihrer Typen nicht stumm ist — sonst
 * stünde eine bewusst abgeschaltete Kategorie nach einem neuen Typ wieder auf
 * „an“.
 */
export function isCategoryEnabled(category: NotificationCategory, muted: readonly string[]) {
  return NOTIFICATION_CATEGORIES[category].some((type) => !muted.includes(type));
}

export function setCategoryEnabled(
  category: NotificationCategory,
  enabled: boolean,
  muted: readonly string[],
): string[] {
  const types: readonly string[] = NOTIFICATION_CATEGORIES[category];
  const others = muted.filter((type) => !types.includes(type));
  return enabled ? others : [...others, ...types];
}

/** Uhrzeiten im Viertelstundenraster für die Auswahl. */
export const BRIEFING_TIMES = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function fromRow(row: {
  briefing_enabled: boolean | null;
  briefing_time: string | null;
  briefing_blocks: unknown;
  muted_types: string[] | null;
  quiet_hours_enabled: boolean | null;
  timezone: string | null;
}): NotificationPreferences {
  const d = DEFAULT_NOTIFICATION_PREFERENCES;
  const blocks =
    row.briefing_blocks &&
    typeof row.briefing_blocks === 'object' &&
    !Array.isArray(row.briefing_blocks)
      ? Object.fromEntries(
          Object.entries(row.briefing_blocks as Record<string, unknown>).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
          ),
        )
      : {};
  return {
    briefingEnabled: row.briefing_enabled ?? d.briefingEnabled,
    // Postgres liefert `time` als `HH:MM:SS`.
    briefingTime: row.briefing_time?.slice(0, 5) || d.briefingTime,
    briefingBlocks: blocks,
    mutedTypes: row.muted_types ?? [],
    quietHoursEnabled: row.quiet_hours_enabled ?? d.quietHoursEnabled,
    timezone: row.timezone || d.timezone,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const userId = user?.id;
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['notification-preferences', companyId, userId],
    enabled: Boolean(userId && companyId),
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select(
          'briefing_enabled, briefing_time, briefing_blocks, muted_types, quiet_hours_enabled, timezone',
        )
        .eq('company_id', companyId!)
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ? fromRow(data) : DEFAULT_NOTIFICATION_PREFERENCES;
    },
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const userId = user?.id;
  const companyId = membership?.companyId;
  const key = ['notification-preferences', companyId, userId];

  return useMutation({
    mutationFn: async (next: NotificationPreferences) => {
      const { error } = await supabase.from('notification_preferences').upsert(
        [
          {
            user_id: userId!,
            company_id: companyId!,
            briefing_enabled: next.briefingEnabled,
            briefing_time: next.briefingTime,
            briefing_blocks: next.briefingBlocks,
            muted_types: next.mutedTypes,
            quiet_hours_enabled: next.quietHoursEnabled,
            timezone: next.timezone,
            modified_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'user_id,company_id' },
      );
      if (error) throw error;
    },
    // Schalter reagieren sofort; scheitert das Speichern, springt der Stand zurück.
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
