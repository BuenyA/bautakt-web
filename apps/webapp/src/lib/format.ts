const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Datum aus ISO-String oder null. Leere Werte bleiben leer, kein Platzhalter-Gedankenstrich. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
}

/** Uhrzeit aus ISO-String. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
}

/** Datum und Uhrzeit aus ISO-String. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateTimeFormatter.format(date);
}

/**
 * Zeitraum: gleicher Tag → „31.08.2026, 07:00–16:00", sonst beide Datumszeiten.
 */
export function formatDateTimeRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  if (!startsAt) return '';
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return '';

  if (!endsAt) return formatDateTime(startsAt);

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return formatDateTime(startsAt);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${formatDate(startsAt)}, ${formatTime(startsAt)}–${formatTime(endsAt)}`;
  }

  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}

/**
 * Nettodauer aus Beginn, Ende und Pause. Ohne Ende leer (laufender Eintrag).
 * Ausgabe z. B. „8:00 Std." oder „0:45 Std.".
 */
export function formatNetDuration(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
  breakMinutes: number | null | undefined,
): string {
  if (!startedAt || !endedAt) return '';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const breakMs = Math.max(0, breakMinutes ?? 0) * 60_000;
  const totalMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime() - breakMs) / 60_000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')} Std.`;
}

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return currencyFormatter.format(value);
}

/** Montag 00:00 und Sonntag 23:59:59.999 der Kalenderwoche von `reference` (lokal). */
export function getLocalWeekBounds(reference: Date = new Date()): { start: Date; end: Date } {
  const day = reference.getDay(); // 0 = So … 6 = Sa
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
