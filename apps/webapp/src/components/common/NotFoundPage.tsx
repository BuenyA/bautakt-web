import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { HOME_ROUTE } from '@/lib/routes';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">{t('common:notFound.title')}</h1>
      <p className="text-muted-foreground">{t('common:notFound.description')}</p>
      <Button asChild className="mt-4">
        <Link to={HOME_ROUTE}>{t('common:notFound.action')}</Link>
      </Button>
    </div>
  );
}
