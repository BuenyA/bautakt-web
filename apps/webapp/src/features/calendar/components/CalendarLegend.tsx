import { useTranslation } from 'react-i18next';

import { type EntryTone, ToneDot } from './entries';

const TONES: readonly EntryTone[] = ['me', 'all', 'assignment', 'absence'];

/** Was die Farben bedeuten — privat, Firma, Einsatz, Abwesenheit. */
export function CalendarLegend({ showAssignments }: { showAssignments: boolean }) {
  const { t } = useTranslation();
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {TONES.filter((tone) => showAssignments || tone !== 'assignment').map((tone) => (
        <li key={tone} className="flex items-center gap-1.5">
          <ToneDot tone={tone} />
          {t(`domain:calendar.legend.${tone}`)}
        </li>
      ))}
    </ul>
  );
}
