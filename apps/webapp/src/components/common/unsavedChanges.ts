import { createContext, useContext, useEffect, useId } from 'react';

export type UnsavedChangesRegistry = {
  report: (id: string, dirty: boolean) => void;
};

/**
 * Getrennt von `UnsavedChangesGuard`, damit Fast Refresh die Komponente
 * nicht neu lädt (`react-refresh/only-export-components`).
 */
export const UnsavedChangesContext = createContext<UnsavedChangesRegistry | null>(null);

/**
 * Meldet ungespeicherte Eingaben an den nächsten `UnsavedChangesGuard`.
 * Ohne Guard darüber tut der Hook nichts.
 */
export function useReportUnsaved(dirty: boolean) {
  const registry = useContext(UnsavedChangesContext);
  const id = useId();
  useEffect(() => {
    if (!registry) return;
    registry.report(id, dirty);
    return () => registry.report(id, false);
  }, [registry, id, dirty]);
}
