import { cn } from '@bautakt/ui';
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Switch,
  Tooltip,
} from '@fluentui/react-components';
import { SettingsRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import type { CalendarSettings } from '../useCalendarSettings';
import { ColorDot } from './entries';
import { CALENDAR_COLORS, type CalendarColor, ENTRY_TONES, type EntryTone } from './entryStyles';

/**
 * Zahnrad neben „Heute“: je Art (privat, Firma, Einsatz, Abwesenheit) ein
 * Schalter „anzeigen“ und die Farbe. Ersetzt die frühere Legende, die über
 * dem Kalender Platz wegnahm.
 */
export function CalendarSettingsPopover({
  settings,
  onColorChange,
  onShowChange,
}: {
  settings: CalendarSettings;
  onColorChange: (tone: EntryTone, color: CalendarColor) => void;
  onShowChange: (tone: EntryTone, show: boolean) => void;
}) {
  const { t } = useTranslation();
  const label = t('domain:calendar.settings.title');

  return (
    <Popover positioning="below-end" withArrow>
      <PopoverTrigger disableButtonEnhancement>
        <Tooltip content={label} relationship="label">
          <Button icon={<SettingsRegular />} />
        </Tooltip>
      </PopoverTrigger>
      <PopoverSurface aria-label={label} className="w-72 max-w-[calc(100vw-2rem)]">
        <h2 className="text-foreground mb-3 text-sm font-semibold">{label}</h2>
        <ul className="flex flex-col gap-4">
          {ENTRY_TONES.map((tone) => {
            const name = t(`domain:calendar.legend.${tone}`);
            return (
              <li key={tone} className="flex flex-col gap-1.5">
                <Switch
                  checked={settings.show[tone]}
                  onChange={(_, data) => onShowChange(tone, data.checked)}
                  label={name}
                />
                <div
                  role="radiogroup"
                  aria-label={t('domain:calendar.settings.colorOf', { name })}
                  className="flex flex-wrap gap-1.5 pl-1"
                >
                  {CALENDAR_COLORS.map((color) => (
                    <label key={color} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`calendar-color-${tone}`}
                        className="peer sr-only"
                        checked={settings.colors[tone] === color}
                        onChange={() => onColorChange(tone, color)}
                        aria-label={t(`domain:calendar.settings.colors.${color}`)}
                      />
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-(--colorNeutralBackground1)',
                          'peer-focus-visible:ring-2 peer-focus-visible:ring-(--colorStrokeFocus2)',
                          settings.colors[tone] === color
                            ? 'ring-foreground ring-2'
                            : 'hover:ring-border hover:ring-2',
                        )}
                      >
                        {/* Fluents Punktgröße ist ungelayert, daher `!`. */}
                        <ColorDot color={color} className="size-4!" />
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </PopoverSurface>
    </Popover>
  );
}
