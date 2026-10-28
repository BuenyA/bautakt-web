import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { createParam } from '@/lib/routes';

/**
 * Öffnet das Anlege-Panel einer Liste, wenn die Adresse `?neu=1` trägt, und
 * nimmt den Parameter danach wieder heraus (sonst öffnete ein Neuladen das
 * Panel erneut).
 *
 * `enabled` ist das Recht, das auch den Anlegen-Knopf der Seite zeigt. Solange
 * die Mitgliedschaft lädt, ist es `false`; der Effekt wartet dann.
 *
 * ⚠️ `open` liegt in einem Ref und läuft genau einmal je `?neu=1`. Als
 * Effekt-Abhängigkeit hätte jede neue Funktion (Inline-Lambda, neuer Entwurf)
 * den Effekt erneut ausgelöst, bevor der Router den Parameter entfernt hat:
 * eine Render-Schleife, gemessen 2026-10-10 mit Dutzenden `open()` pro
 * Sekunde und einem Panel, das sofort wieder zuging.
 */
export function useCreateFromUrl(enabled: boolean, open: () => void) {
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = searchParams.get(createParam) === '1';
  const openRef = useRef(open);
  const handledRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!wanted) {
      handledRef.current = false;
      return;
    }
    if (!enabled || handledRef.current) return;
    handledRef.current = true;
    openRef.current();
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(createParam);
        return next;
      },
      { replace: true },
    );
  }, [wanted, enabled, setSearchParams]);
}
