import { useTranslation } from 'react-i18next';

import { PageHeader } from './PageHeader';

/**
 * Platzhalter fuer ein noch nicht gebautes Modul.
 *
 * Die Routen existieren bereits, damit Navigation, Rechte-Gating und Deployment
 * am fertigen Geruest geprueft werden koennen, bevor der Inhalt entsteht.
 */
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t(titleKey)} />
      <p className="text-sm text-muted-foreground">{t('common:state.comingSoon')}</p>
    </div>
  );
}
