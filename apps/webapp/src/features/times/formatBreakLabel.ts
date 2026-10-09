import type { TFunction } from 'i18next';

import { formatBreakDuration } from '@/lib/format';

/**
 * „Pause 0:30 Std.“ — oder leer, wenn keine Pause erfasst ist.
 * Dieselbe Zeichenkette auf der Auftragskarte und in der Zeitenliste.
 */
export function formatBreakLabel(breakMinutes: number | null | undefined, t: TFunction): string {
  const duration = formatBreakDuration(breakMinutes);
  if (!duration) return '';
  return t('domain:times.breakLabel', { duration });
}
