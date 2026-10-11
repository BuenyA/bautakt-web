import { Text } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

function greetingKey(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

/**
 * Kopf der Übersicht: Gruß und Datum. Bewusst ohne Zähler-Chips darunter —
 * sie wiederholten nur, was die Spalten direkt darunter zeigen.
 */
export function OverviewGreeting({ firstName }: { firstName: string }) {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const greeting = t(`domain:overview.greeting.${greetingKey(now.getHours())}`);
  const date = now.toLocaleDateString(i18n.language || 'de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="flex flex-col gap-0.5">
      <Text as="h1" size={700} weight="semibold">
        {firstName
          ? t('domain:overview.greeting.withName', { greeting, name: firstName })
          : greeting}
      </Text>
      <Text size={300} className="text-text-secondary">
        {date}
      </Text>
    </header>
  );
}
