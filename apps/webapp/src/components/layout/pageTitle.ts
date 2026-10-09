import { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Titel der aktuellen Seite — eine Quelle für den Browser-Tab (#94) und
 * später für die letzte Brotkrume (#104).
 *
 * Listen und Hubs brauchen nichts zu tun: Die Shell leitet ihren Titel aus
 * der Navigation ab. Nur Detail- und Anlegeseiten kennen den Namen des
 * Datensatzes und melden ihn mit `usePageTitle`.
 */

/** „Aufträge · Bautakt“. Ohne Seitennamen bleibt nur der App-Name. */
export function formatDocumentTitle(page: string | null | undefined, appName: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${appName}` : appName;
}

type PageTitleState = {
  detailTitle: string | null;
  setDetailTitle: (title: string | null) => void;
};

export const PageTitleContext = createContext<PageTitleState | null>(null);

/** Der von der Seite gemeldete Objektname, `null` solange keiner bekannt ist. */
export function useDetailTitle(): string | null {
  return useContext(PageTitleContext)?.detailTitle ?? null;
}

/**
 * Meldet den Objektnamen der Seite an die Shell („Musterauftrag“,
 * „RE00002“, „Neue Rechnung“). Während des Ladens `null` übergeben — dann
 * bleibt der Bereichsname stehen statt eines falschen Namens.
 */
export function usePageTitle(title: string | null | undefined): void {
  const setDetailTitle = useContext(PageTitleContext)?.setDetailTitle;
  const value = title?.trim() || null;

  useEffect(() => {
    if (!setDetailTitle) return;
    setDetailTitle(value);
    return () => setDetailTitle(null);
  }, [setDetailTitle, value]);
}

/**
 * Für Seiten außerhalb der Shell (Anmelden, Registrieren, 404): setzt den
 * Tab-Titel direkt und stellt beim Verlassen den vorherigen wieder her.
 */
export function useDocumentTitle(page: string | null | undefined): void {
  const { t } = useTranslation();
  const next = formatDocumentTitle(page, t('common:app.name'));

  useEffect(() => {
    const previous = document.title;
    document.title = next;
    return () => {
      document.title = previous;
    };
  }, [next]);
}
