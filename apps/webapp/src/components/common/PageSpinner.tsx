import { useTranslation } from 'react-i18next';

/** Ladezustand innerhalb einer bereits gerenderten Shell-Seite. */
export function PageSpinner() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-48 items-center justify-center" role="status">
      <span className="sr-only">{t('common:state.loading')}</span>
      <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
