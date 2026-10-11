import { InteractionTag, InteractionTagPrimary, TagGroup, Text } from '@fluentui/react-components';
import {
  CalendarClockRegular,
  DocumentArrowDownRegular,
  type FluentIcon,
  PersonClockRegular,
  PersonDeleteRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

export type GreetingChip = {
  key: string;
  count: number;
  /** Abschnitt, zu dem der Chip springt. */
  target: string;
  tone?: 'danger';
};

const ICONS: Record<string, FluentIcon> = {
  pendingAbsences: PersonClockRegular,
  absentToday: PersonDeleteRegular,
  newIncoming: DocumentArrowDownRegular,
  deadlinesDue: CalendarClockRegular,
  overdue: WarningRegular,
};

function greetingKey(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

/**
 * Kopf der Übersicht: Gruß, Datum und Chips mit dem, was heute wartet.
 * Ein Chip erscheint nur mit Zähler über null; ein Klick springt zum
 * Abschnitt weiter unten.
 */
export function OverviewGreeting({
  firstName,
  chips,
}: {
  firstName: string;
  chips: GreetingChip[];
}) {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const greeting = t(`domain:overview.greeting.${greetingKey(now.getHours())}`);
  const date = now.toLocaleDateString(i18n.language || 'de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const visible = chips.filter((chip) => chip.count > 0);

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Text as="h1" size={700} weight="semibold">
          {firstName
            ? t('domain:overview.greeting.withName', { greeting, name: firstName })
            : greeting}
        </Text>
        <Text size={300} className="text-text-secondary">
          {date}
        </Text>
      </div>

      {visible.length > 0 ? (
        <TagGroup aria-label={t('domain:overview.chips.label')} className="flex-wrap gap-2">
          {visible.map((chip) => {
            const Icon = ICONS[chip.key] ?? WarningRegular;
            return (
              <InteractionTag
                key={chip.key}
                value={chip.key}
                appearance={chip.tone === 'danger' ? 'brand' : 'outline'}
                shape="circular"
                size="small"
              >
                <InteractionTagPrimary
                  icon={<Icon />}
                  onClick={() =>
                    document
                      .getElementById(chip.target)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  {t(`domain:overview.chips.${chip.key}`, { count: chip.count })}
                </InteractionTagPrimary>
              </InteractionTag>
            );
          })}
        </TagGroup>
      ) : (
        <Text size={300} className="text-text-secondary">
          {t('domain:overview.chips.allClear')}
        </Text>
      )}
    </header>
  );
}
