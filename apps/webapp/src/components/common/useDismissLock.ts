import { useCallback, useEffect, useRef } from 'react';

/**
 * Hält ein gesteuertes Sheet offen, solange eine Mutation läuft.
 *
 * Das Formular darin ist nur gemountet, solange das Panel offen ist. Schließt
 * es vorher, ist die Anfrage noch unterwegs — ein Neuladen bricht sie ab.
 * Die Sperre liegt in einem Ref, damit der Schließen-Handler den Stand aus
 * dem letzten `onBusyChange` sieht und nicht den aus einem alten Render.
 */
export function useDismissLock(onOpenChange: (open: boolean) => void) {
  const lockedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const onBusyChange = useCallback((busy: boolean) => {
    lockedRef.current = busy;
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next && lockedRef.current) return;
    onOpenChangeRef.current(next);
  }, []);

  return { onBusyChange, handleOpenChange };
}
