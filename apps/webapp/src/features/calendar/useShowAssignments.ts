import { useState } from 'react';

import { useAuth } from '@/features/auth/useAuth';

const STORAGE_PREFIX = 'bautakt-calendar-assignments:';

function readStored(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Ob der Kalender Einsätze zeigt. Manche planen Einsätze nur in der
 * Einsatzplanung und wollen im Kalender nur Termine sehen. Standard: an.
 *
 * Gespeichert je Nutzer im localStorage (wie die Theme-Wahl), also je Browser,
 * nicht geräteübergreifend. Ohne Storage (privates Fenster) gilt der Standard.
 */
export function useShowAssignments(): [boolean, (next: boolean) => void] {
  const { user } = useAuth();
  const key = `${STORAGE_PREFIX}${user?.id ?? 'anon'}`;
  const [show, setShow] = useState(() => readStored(key));

  function update(next: boolean) {
    setShow(next);
    try {
      if (next) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, 'off');
    } catch {
      // Ohne Storage gilt die Wahl nur bis zum Neuladen.
    }
  }

  return [show, update];
}
