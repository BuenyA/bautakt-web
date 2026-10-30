import { SkeletonBlock, toast } from '@bautakt/ui';
import { MessageBar, MessageBarBody, Radio, RadioGroup } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';

import { useProfileDetails, useUpdateProfile } from '../useProfile';

/**
 * Sprachen der App (`bautakt-app/app/constants/languages.ts`), Namen in der
 * eigenen Sprache. Gespeichert wird der Code in `profiles.language`.
 */
const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'pl', name: 'Polski' },
  { code: 'ro', name: 'Română' },
  { code: 'bg', name: 'Български' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'bs', name: 'Bosanski' },
  { code: 'sr', name: 'Srpski' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'hu', name: 'Magyar' },
] as const;

/**
 * Sprache: gilt für die Handy-App und die Push-Nachrichten. Die Web-App
 * pflegt bisher nur Deutsch (Scope-Entscheidung, siehe `lib/i18n.ts`) — das
 * steht offen dabei, statt eine Auswahl ohne Wirkung vorzutäuschen.
 */
export function LanguagePage() {
  const { t } = useTranslation();
  const profile = useProfileDetails();
  const update = useUpdateProfile();

  return (
    <SubPage title={t('account:language.title')} description={t('account:language.description')}>
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>{t('account:language.webNote')}</MessageBarBody>
      </MessageBar>
      <SectionCard title={t('account:language.available')}>
        {profile.data ? (
          <RadioGroup
            aria-label={t('account:language.available')}
            value={profile.data.language}
            disabled={update.isPending}
            className="grid gap-1 sm:grid-cols-2"
            onChange={(_, data) =>
              update.mutate(
                { language: data.value },
                {
                  onSuccess: () => toast.success(t('account:language.saved')),
                  onError: (caught) =>
                    toast.error(t('domain:settings.saveError'), {
                      description: readableDbError(caught) ?? undefined,
                    }),
                },
              )
            }
          >
            {LANGUAGES.map((language) => (
              <Radio
                key={language.code}
                value={language.code}
                label={<span lang={language.code}>{language.name}</span>}
              />
            ))}
          </RadioGroup>
        ) : (
          <SkeletonBlock className="h-40 w-full" />
        )}
      </SectionCard>
    </SubPage>
  );
}
