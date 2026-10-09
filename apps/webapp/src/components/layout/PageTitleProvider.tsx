import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { breadcrumbModel } from './navItems';
import { formatDocumentTitle, PageTitleContext } from './pageTitle';

/**
 * Hält den Objektnamen, den eine Detailseite meldet, und schreibt daraus den
 * Tab-Titel. Ohne gemeldeten Namen gilt der Bereich aus der Navigation —
 * dieselbe Bezeichnung wie in Seitenleiste und Brotkrume.
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [detailTitle, setDetailTitle] = useState<string | null>(null);

  const model = breadcrumbModel(pathname);
  const sectionKey = model?.crumbs.at(-1)?.labelKey;
  const page = detailTitle ?? (sectionKey ? t(sectionKey) : null);
  const title = formatDocumentTitle(page, t('common:app.name'));

  useEffect(() => {
    document.title = title;
  }, [title]);

  const value = useMemo(() => ({ detailTitle, setDetailTitle }), [detailTitle]);

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}
