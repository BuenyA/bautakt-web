import {
  ChatHelp20Regular,
  Gavel20Regular,
  LocalLanguage20Regular,
  Person20Regular,
  ShieldLock20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { UnsavedChangesGuard } from '@/components/common/UnsavedChangesGuard';
import { type SubNavGroup, SubNavLayout } from '@/components/layout/SubNavLayout';
import { useAuth } from '@/features/auth/useAuth';
import { routes } from '@/lib/routes';

/**
 * Mein Profil: alles zur eigenen Person — Daten und Bild, Anmeldung,
 * Sprache, Hilfe und Rechtliches. Aufbau nach „Mein Profil“ der App
 * (`bautakt-app/app/app/(tabs)/settings/account`). Gerätezugriffe gibt es im
 * Browser nicht; der Punkt „Berechtigungen“ fehlt bewusst (Owner, 2026-10-30).
 */
const GROUPS: SubNavGroup[] = [
  {
    titleKey: 'account:profile.groupAccount',
    items: [
      {
        to: routes.profilePersonal,
        labelKey: 'account:profile.nav.personal',
        icon: Person20Regular,
      },
      {
        to: routes.profileAccount,
        labelKey: 'account:profile.nav.account',
        icon: ShieldLock20Regular,
      },
      {
        to: routes.profileLanguage,
        labelKey: 'account:profile.nav.language',
        icon: LocalLanguage20Regular,
      },
    ],
  },
  {
    titleKey: 'account:profile.groupSupport',
    items: [
      { to: routes.profileHelp, labelKey: 'account:profile.nav.help', icon: ChatHelp20Regular },
      { to: routes.profileLegal, labelKey: 'account:profile.nav.legal', icon: Gavel20Regular },
    ],
  },
];

export function ProfileLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <UnsavedChangesGuard>
      <SubNavLayout
        title={t('account:profile.title')}
        subtitle={user?.email}
        basePath={routes.profile}
        groups={GROUPS}
        indexPage={false}
        ariaLabel={t('account:profile.navLabel')}
      />
    </UnsavedChangesGuard>
  );
}
