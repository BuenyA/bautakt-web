/**
 * Arten und Status einer Abwesenheit.
 *
 * ⚠️ Die Werte sind DEUTSCH und stehen so in der Datenbank („urlaub",
 * „genehmigt") — nicht englisch, wie man es vom uebrigen Schema erwartet.
 * Uebernommen aus bautakt-app (`lib/absenceStorage.ts`, `lib/employees/labels.ts`,
 * Stand 2026-09-24); die Mobile-App bleibt kanonisch.
 *
 * Wer hier englische Schluessel einsetzt, bekommt keinen Fehler, sondern
 * unuebersetzte Rohwerte in der Liste — genau das war hier schon einmal der Fall.
 */
export const ABSENCE_TYPES = [
  'urlaub',
  'krankheit',
  'kind_krank',
  'weiterbildung',
  'pruefung',
  'sonderurlaub',
  'unbezahlter_urlaub',
  'mutterschutz_elternzeit',
  'arztbesuch',
  'unentschuldigt',
  'sonstiges',
] as const;

export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_STATUSES = ['ausstehend', 'genehmigt', 'abgelehnt', 'storniert'] as const;

export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];

/** Offen heisst hier „ausstehend" — der Status, auf den jemand warten muss. */
export const PENDING_STATUS: AbsenceStatus = 'ausstehend';
