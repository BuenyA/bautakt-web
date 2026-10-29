import { cn } from '@bautakt/ui';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { LEGAL_PAGES, legalPath } from '@/lib/legal';

/**
 * „Impressum · Datenschutz“ unter den Anmeldeseiten.
 *
 * Nur Seiten, die `legal.ts` als veröffentlicht führt. AGB fehlt, solange
 * es in der Web-App keine Seite gibt.
 */
export function LegalLinks({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('common:legal.label')} className={cn('text-xs', className)}>
      <ul className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {LEGAL_PAGES.map((page, index) => {
          const path = legalPath(page);
          if (!path) return null;
          return (
            <Fragment key={page}>
              {index > 0 ? (
                <li aria-hidden="true" className="text-text-subtle">
                  ·
                </li>
              ) : null}
              <li>
                <RouterLink to={path} appearance="subtle">
                  {t(`common:legal.${page}`)}
                </RouterLink>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
