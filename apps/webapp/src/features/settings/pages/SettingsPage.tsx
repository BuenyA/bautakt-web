import { darkTheme, lightTheme, SkeletonBlock, toast } from '@bautakt/ui';
import {
  Dropdown,
  Field,
  FluentProvider,
  makeStyles,
  mergeClasses,
  Option,
  Radio,
  RadioGroup,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { type Theme } from '@/app/ThemeContext';
import { useTheme } from '@/app/useTheme';
import { SwitchRow } from '@/components/common/SwitchRow';
import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';

import {
  BRIEFING_TIMES,
  CATEGORY_ORDER,
  isCategoryEnabled,
  type NotificationPreferences,
  setCategoryEnabled,
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from '../notificationPreferences';

const THEMES: Theme[] = ['light', 'dark', 'system'];

const useStyles = makeStyles({
  // Fluents RadioGroup setzt `display: flex` selbst; Tailwind verlöre dagegen.
  group: {
    display: 'grid',
    gap: tokens.spacingHorizontalM,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  // Radio als Kachel: Kreis links oben, daneben Vorschau und Name.
  tile: {
    alignItems: 'flex-start',
    padding: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusLarge,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
  },
  tileLabel: {
    flexGrow: 1,
    minWidth: 0,
  },
  tileSelected: {
    border: `${tokens.strokeWidthThick} solid ${tokens.colorBrandStroke1}`,
  },
  preview: {
    display: 'flex',
    height: '72px',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  previewRail: {
    width: '28%',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  previewBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
  },
  previewBar: {
    height: '6px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralStroke1,
  },
  previewAccent: {
    height: '6px',
    width: '40%',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorBrandBackground,
  },
  half: {
    display: 'flex',
    flex: 1,
  },
});

/**
 * Miniatur der Oberfläche in Fluents eigenem Theme — keine eigenen Farben.
 * „Wie das System“ zeigt beide Hälften nebeneinander.
 */
function ThemePreview({ theme }: { theme: Theme }) {
  const styles = useStyles();
  const mini = (
    <div className={styles.preview}>
      <div className={styles.previewRail} />
      <div className={styles.previewBody}>
        <div className={styles.previewAccent} />
        <div className={styles.previewBar} />
        <div className={styles.previewBar} />
      </div>
    </div>
  );
  if (theme === 'system') {
    return (
      <div className="flex gap-1">
        {[lightTheme, darkTheme].map((fluentTheme, index) => (
          <div key={index} className="min-w-0 flex-1">
            <FluentProvider theme={fluentTheme}>{mini}</FluentProvider>
          </div>
        ))}
      </div>
    );
  }
  return <FluentProvider theme={theme === 'dark' ? darkTheme : lightTheme}>{mini}</FluentProvider>;
}

function AppearanceCard() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { theme, setTheme } = useTheme();

  return (
    <SectionCard title={t('account:settings.appearance.title')}>
      <RadioGroup
        aria-label={t('account:settings.appearance.title')}
        value={theme}
        onChange={(_, data) => setTheme(data.value as Theme)}
        className={styles.group}
      >
        {THEMES.map((option) => (
          // Die Vorschau steht im Label des Radios: ein Klick darauf wählt aus,
          // Tastatur und Screenreader bedienen den Radio wie gewohnt.
          <Radio
            key={option}
            value={option}
            className={mergeClasses(styles.tile, theme === option && styles.tileSelected)}
            label={{
              className: styles.tileLabel,
              children: (
                <span className="flex flex-col gap-2">
                  <ThemePreview theme={option} />
                  <span>{t(`common:theme.${option}`)}</span>
                </span>
              ),
            }}
          />
        ))}
      </RadioGroup>
      <Text className="text-muted-foreground">{t('account:settings.appearance.hint')}</Text>
    </SectionCard>
  );
}

function NotificationsCard() {
  const { t } = useTranslation();
  const preferences = useNotificationPreferences();
  const save = useSaveNotificationPreferences();
  const value = preferences.data;

  function update(patch: Partial<NotificationPreferences>) {
    if (!value) return;
    save.mutate(
      { ...value, ...patch },
      {
        onError: (caught) =>
          toast.error(t('account:settings.notifications.saveError'), {
            description: readableDbError(caught) ?? undefined,
          }),
      },
    );
  }

  return (
    <SectionCard
      title={t('account:settings.notifications.title')}
      description={t('account:settings.notifications.description')}
    >
      {!value ? (
        <SkeletonBlock className="h-48 w-full" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Text weight="semibold">{t('account:settings.notifications.briefing')}</Text>
            <Switch
              checked={value.briefingEnabled}
              label={t('account:settings.notifications.briefingLabel')}
              onChange={(_, d) => update({ briefingEnabled: d.checked })}
            />
            {value.briefingEnabled ? (
              <Field
                label={t('account:settings.notifications.briefingTime')}
                hint={t('account:settings.notifications.briefingTimeHint')}
                className="max-w-48"
              >
                <Dropdown
                  value={value.briefingTime}
                  selectedOptions={[value.briefingTime]}
                  onOptionSelect={(_, d) =>
                    d.optionValue && update({ briefingTime: d.optionValue })
                  }
                >
                  {BRIEFING_TIMES.map((time) => (
                    <Option key={time} value={time}>
                      {time}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Text weight="semibold">{t('account:settings.notifications.quiet')}</Text>
            <Switch
              checked={value.quietHoursEnabled}
              label={t('account:settings.notifications.quietLabel')}
              onChange={(_, d) => update({ quietHoursEnabled: d.checked })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Text weight="semibold">{t('account:settings.notifications.types')}</Text>
            {CATEGORY_ORDER.map((category) => (
              <SwitchRow
                key={category}
                checked={isCategoryEnabled(category, value.mutedTypes)}
                label={t(`account:settings.notifications.categories.${category}.label`)}
                description={t(`account:settings.notifications.categories.${category}.hint`)}
                onChange={(checked) =>
                  update({
                    mutedTypes: setCategoryEnabled(category, checked, value.mutedTypes),
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Einstellungen: nur noch, wie Bautakt sich für mich verhält — Darstellung
 * und Benachrichtigungen. Alles zum Betrieb liegt unter „Unternehmen“, alles
 * zu meiner Person unter „Mein Profil“ (Owner, 2026-10-30).
 *
 * Die Darstellung gilt für diesen Browser (`ThemeProvider`); die
 * Benachrichtigungen gelten je Betrieb und auch in der App.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <SubPage title={t('account:settings.title')} description={t('account:settings.description')}>
        <AppearanceCard />
        <NotificationsCard />
      </SubPage>
    </div>
  );
}
