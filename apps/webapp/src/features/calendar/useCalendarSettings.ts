import { useState } from 'react';

import { useAuth } from '@/features/auth/useAuth';

import {
  CALENDAR_COLORS,
  type CalendarColor,
  DEFAULT_TONE_COLORS,
  ENTRY_TONES,
  type EntryTone,
} from './components/entryStyles';

export type CalendarSettings = {
  colors: Record<EntryTone, CalendarColor>;
  show: Record<EntryTone, boolean>;
};

const STORAGE_PREFIX = 'bautakt-calendar-settings:';
/** Vorgänger: speicherte nur „Einsätze aus“ als `'off'`. */
const LEGACY_PREFIX = 'bautakt-calendar-assignments:';

const DEFAULT_SHOW: Record<EntryTone, boolean> = {
  me: true,
  all: true,
  assignment: true,
  absence: true,
};

function readStored(userKey: string): CalendarSettings {
  const settings: CalendarSettings = {
    colors: { ...DEFAULT_TONE_COLORS },
    show: { ...DEFAULT_SHOW },
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CalendarSettings>;
      // Jeden Wert einzeln prüfen: ein kaputter Eintrag soll nur sich selbst verlieren.
      for (const tone of ENTRY_TONES) {
        const color = parsed.colors?.[tone];
        if (CALENDAR_COLORS.includes(color as CalendarColor)) settings.colors[tone] = color!;
        const show = parsed.show?.[tone];
        if (typeof show === 'boolean') settings.show[tone] = show;
      }
    } else if (window.localStorage.getItem(LEGACY_PREFIX + userKey) === 'off') {
      settings.show.assignment = false;
    }
  } catch {
    // Ohne Storage (privates Fenster) oder mit kaputtem JSON gelten die Standards.
  }
  return settings;
}

/**
 * Kalender-Einstellungen: Farbe und „anzeigen“ je Art (privat, Firma,
 * Einsatz, Abwesenheit). Manche planen Einsätze nur in der Einsatzplanung
 * und wollen im Kalender nur Termine sehen.
 *
 * Gespeichert je Nutzer im localStorage (wie die Theme-Wahl), also je Browser,
 * nicht geräteübergreifend.
 */
export function useCalendarSettings(): {
  settings: CalendarSettings;
  setColor: (tone: EntryTone, color: CalendarColor) => void;
  setShow: (tone: EntryTone, show: boolean) => void;
} {
  const { user } = useAuth();
  const userKey = user?.id ?? 'anon';
  const [settings, setSettings] = useState(() => readStored(userKey));

  function update(next: CalendarSettings) {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + userKey, JSON.stringify(next));
      window.localStorage.removeItem(LEGACY_PREFIX + userKey);
    } catch {
      // Ohne Storage gilt die Wahl nur bis zum Neuladen.
    }
  }

  return {
    settings,
    setColor: (tone, color) =>
      update({ ...settings, colors: { ...settings.colors, [tone]: color } }),
    setShow: (tone, show) => update({ ...settings, show: { ...settings.show, [tone]: show } }),
  };
}
