import { useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { HOME_ROUTE } from '@/lib/routes';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">{t('common:notFound.title')}</h1>
      <p className="text-muted-foreground">{t('common:notFound.description')}</p>
      <LinkButton appearance="primary" to={HOME_ROUTE}>
        {t('common:notFound.action')}
      </LinkButton>
    </div>
  );
}
