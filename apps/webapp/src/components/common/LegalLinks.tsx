import { cn } from '@bautakt/ui';
import { Link } from '@fluentui/react-components';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { LEGAL_PAGES, legalUrl } from '@/lib/legal';

/**
 * „Impressum · Datenschutz · AGB“ unter den Anmelde-Seiten.
 *
 * Öffnet in einem neuen Tab, damit ein halb ausgefülltes Formular nicht
 * verloren geht. Der Hinweis darauf steht für Screenreader im Link.
 */
export function LegalLinks({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('common:legal.label')} className={cn('text-xs', className)}>
      <ul className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {LEGAL_PAGES.map((page, index) => (
          <Fragment key={page}>
            {index > 0 ? (
              <li aria-hidden="true" className="text-text-subtle">
                ·
              </li>
            ) : null}
            <li>
              <Link
                href={legalUrl(page)}
                target="_blank"
                rel="noopener noreferrer"
                appearance="subtle"
              >
                {t(`common:legal.${page}`)}
                <span className="sr-only"> {t('common:legal.newTab')}</span>
              </Link>
            </li>
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}
