import { Button, Popover, PopoverContent, PopoverTrigger, Uicon } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

/**
 * Glocke im Seitenkopf. Bis das Benachrichtigungszentrum steht (#92), öffnet
 * sie nur den Leerzustand — ein Klick soll etwas Erwartbares tun, statt
 * stumm zu bleiben oder interne Planungssprache zu zeigen (#91).
 */
export function NotificationsBell() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t('common:notifications.title')}
        >
          <Uicon name="bell" size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-border border-b px-4 py-3 text-sm font-semibold">
          {t('common:notifications.title')}
        </p>
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
            <Uicon name="bell" size={18} />
          </span>
          <p className="text-foreground text-sm font-medium">
            {t('common:notifications.emptyTitle')}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('common:notifications.emptyDescription')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
