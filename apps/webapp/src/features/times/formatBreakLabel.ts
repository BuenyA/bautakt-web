/**
 * Pausenanzeige. 0 bleibt leer. Unter einer Stunde „30 Min.“, volle Stunden
 * „1 Std.“, sonst „1 Std. 15 Min.“. Die Nettodauer bleibt „8:00 Std.“
 */
type BreakTranslate = (key: string, options?: Record<string, string | number>) => string;

export function formatBreakText(
  breakMinutes: number | null | undefined,
  t: BreakTranslate,
): string {
  if (breakMinutes == null || !Number.isFinite(breakMinutes)) return '';
  const total = Math.round(breakMinutes);
  if (total <= 0) return '';

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return t('domain:times.breakMinutes', { minutes });
  if (minutes === 0) return t('domain:times.breakHours', { hours });
  return t('domain:times.breakHoursMinutes', { hours, minutes });
}

/** Dieselbe Dauer mit dem Wort Pause, für die Karte am Auftrag. */
export function formatBreakLabel(
  breakMinutes: number | null | undefined,
  t: BreakTranslate,
): string {
  const duration = formatBreakText(breakMinutes, t);
  if (!duration) return '';
  return t('domain:times.breakLabel', { duration });
}
