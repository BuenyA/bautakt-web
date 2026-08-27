import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';

/** Wird von React Router als errorElement der Wurzelroute verwendet. */
export function ErrorBoundaryPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('errors:boundary.title')}</h1>
      <p className="text-muted-foreground">{t('errors:boundary.description')}</p>
      {import.meta.env.DEV && error instanceof Error ? (
        <pre className="mt-4 max-w-xl overflow-x-auto rounded-md bg-surface p-4 text-left text-xs">
          {error.message}
        </pre>
      ) : null}
      <Button className="mt-4" onClick={() => window.location.reload()}>
        {t('common:action.retry')}
      </Button>
    </div>
  );
}
