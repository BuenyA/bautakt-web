import { Button, Popover, PopoverSurface, PopoverTrigger, Text } from '@fluentui/react-components';
import { Alert20Regular, AlertRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

/**
 * Glocke im Seitenkopf. Bis das Benachrichtigungszentrum steht (#92), öffnet
 * sie nur den Leerzustand — ein Klick soll etwas Erwartbares tun, statt
 * stumm zu bleiben oder interne Planungssprache zu zeigen (#91).
 *
 * Fluent-`Popover` unter der Glocke, rechtsbündig.
 */
export function NotificationsBell() {
  const { t } = useTranslation();

  return (
    <Popover positioning="below-end" withArrow={false}>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<Alert20Regular />}
          aria-label={t('common:notifications.title')}
        />
      </PopoverTrigger>
      <PopoverSurface aria-label={t('common:notifications.title')} className="w-80">
        <Text as="h2" weight="semibold">
          {t('common:notifications.title')}
        </Text>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
            <AlertRegular fontSize={20} aria-hidden />
          </span>
          <Text weight="semibold">{t('common:notifications.emptyTitle')}</Text>
          <Text size={200} className="text-muted-foreground">
            {t('common:notifications.emptyDescription')}
          </Text>
        </div>
      </PopoverSurface>
    </Popover>
  );
}
