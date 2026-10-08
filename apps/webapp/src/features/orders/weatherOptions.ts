/**
 * Wetterlagen, wie sie in `weather_morning` und `weather_afternoon` stehen.
 *
 * Die Spalte ist freier Text (gemessen 2026-10-08, kein Check). Die Handy-App
 * schreibt die deutsche Bezeichnung, nicht einen Schlüssel: an Spahrbau liegen
 * „Sonnig“, „Bewölkt“ und „Leicht bewölkt“. Dieselbe Schreibweise bleibt hier,
 * damit ein Bericht dort weiter als diese Lage erscheint.
 *
 * Ein gespeicherter Wert, der nicht in der Liste steht, bleibt auswählbar.
 * Sonst würde das Select ihn verlieren und beim Speichern leeren.
 */
export const WEATHER_OPTIONS = [
  'Sonnig',
  'Heiter',
  'Leicht bewölkt',
  'Bewölkt',
  'Stark bewölkt',
  'Bedeckt',
  'Nebel',
  'Regen',
  'Schauer',
  'Gewitter',
  'Schnee',
  'Frost',
  'Windig',
] as const;

export function weatherChoices(current: string): string[] {
  const trimmed = current.trim();
  if (!trimmed) return [...WEATHER_OPTIONS];
  if ((WEATHER_OPTIONS as readonly string[]).includes(trimmed)) return [...WEATHER_OPTIONS];
  return [trimmed, ...WEATHER_OPTIONS];
}
