import { Button } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/app/useTheme';
import { RouterLink } from '@/components/common/RouterLink';
import datenschutz from '@/content/legal/datenschutz.md?raw';
import impressum from '@/content/legal/impressum.md?raw';
import { useAuth } from '@/features/auth/useAuth';
import { HOME_ROUTE, routes } from '@/lib/routes';

import { MarkdownDocument } from './MarkdownDocument';

const SOURCE = {
  imprint: impressum,
  privacy: datenschutz,
} as const;

/**
 * Öffentliche Rechtsseite. Liegt ausserhalb von ProtectedRoute und
 * PublicOnlyRoute: ohne Sitzung kein Redirect zum Login, mit Sitzung
 * kein Redirect in die App. Zurück führt zur Anmeldung bzw. zur Übersicht.
 */
export function LegalPage({ page }: { page: keyof typeof SOURCE }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { resolved, setTheme } = useTheme();
  const backTo = session ? HOME_ROUTE : routes.login;
  const backLabel = session ? t('common:legal.backToApp') : t('common:legal.backToSignIn');

  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <RouterLink to={backTo} appearance="subtle">
          {backLabel}
        </RouterLink>
        <div className="flex gap-2">
          <Button
            appearance={resolved === 'light' ? 'primary' : 'subtle'}
            size="small"
            onClick={() => setTheme('light')}
          >
            {t('common:theme.light')}
          </Button>
          <Button
            appearance={resolved === 'dark' ? 'primary' : 'subtle'}
            size="small"
            onClick={() => setTheme('dark')}
          >
            {t('common:theme.dark')}
          </Button>
        </div>
      </header>
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-16 sm:px-6">
        <MarkdownDocument source={SOURCE[page]} />
      </article>
    </div>
  );
}
