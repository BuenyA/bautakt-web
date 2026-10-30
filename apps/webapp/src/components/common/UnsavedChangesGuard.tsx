import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';

import { UnsavedChangesContext } from './unsavedChanges';

/**
 * Fragt nach, bevor ungespeicherte Eingaben verloren gehen: beim Wechsel der
 * Seite in der App (`useBlocker`) und beim Schließen oder Neuladen des Tabs
 * (`beforeunload`, dort zeigt der Browser seinen eigenen Dialog).
 *
 * Ein Guard je Bereich, nicht je Karte: React Router erlaubt nur einen
 * aktiven Blocker. Die Karten melden sich über `useReportUnsaved`.
 */
export function UnsavedChangesGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set());
  const dirty = dirtyIds.size > 0;

  const report = useCallback((id: string, isDirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ report }), [report]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <UnsavedChangesContext.Provider value={registry}>
      {children}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(_, data) => {
          if (!data.open) blocker.reset?.();
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('common:unsaved.title')}</DialogTitle>
            <DialogContent>{t('common:unsaved.description')}</DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => blocker.reset?.()}>
                {t('common:unsaved.stay')}
              </Button>
              <Button appearance="primary" onClick={() => blocker.proceed?.()}>
                {t('common:unsaved.leave')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}
