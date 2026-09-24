import { toIsoDate } from '@bautakt/finance';
import { Button, cn, Uicon } from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useAssignments } from '@/features/assignments/useAssignments';
import { formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type DayCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

/** Sechs Wochen ab dem Montag vor dem Monatsersten — ein stabiles Raster. */
function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Montag = 0
  const start = new Date(year, month, 1 - offset);
  const todayIso = toIsoDate(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const iso = toIsoDate(date);
    return {
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: iso === todayIso,
    };
  });
}

/**
 * Monatskalender der Einsätze.
 *
 * Zeigt dieselben Daten wie die Einsatzliste, nur raeumlich statt zeilenweise —
 * ein Geschaeftsfuehrer plant nach Woche, nicht nach Sortierung. Die Termine
 * aus `calendar_events` sind bewusst nicht dabei: das ist eine eigene Tabelle
 * mit anderem Zuschnitt (persoenliche Termine), und sie hier unter die
 * Einsaetze zu mischen wuerde beides unscharf machen.
 */
export function CalendarPage() {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data, isLoading } = useAssignments('all');

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, { id: string; label: string; startsAt: string }[]>();
    for (const assignment of data ?? []) {
      const iso = assignment.starts_at.slice(0, 10);
      const entries = map.get(iso) ?? [];
      entries.push({
        id: assignment.id,
        label: assignment.order_name || t('domain:assignments.noOrder'),
        startsAt: assignment.starts_at,
      });
      map.set(iso, entries);
    }
    for (const entries of map.values()) {
      entries.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [data, t]);

  const monthLabel = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
    new Date(cursor.year, cursor.month, 1),
  );

  function shift(months: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + months, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:calendar.title')}
        description={t('domain:calendar.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              aria-label={t('domain:calendar.previous')}
              onClick={() => shift(-1)}
            >
              <Uicon name="angle-left" size={16} />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">{monthLabel}</span>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              aria-label={t('domain:calendar.next')}
              onClick={() => shift(1)}
            >
              <Uicon name="angle-right" size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              {t('domain:calendar.today')}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="bg-surface text-muted-foreground grid grid-cols-7 text-xs font-medium">
            {WEEKDAYS.map((day) => (
              <span key={day} className="px-2 py-2 text-center">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const entries = byDay.get(cell.iso) ?? [];
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    'border-border min-h-24 border-t border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0',
                    cell.inMonth ? 'bg-background' : 'bg-surface/40',
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                      cell.isToday
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : cell.inMonth
                          ? 'text-foreground'
                          : 'text-text-subtle',
                    )}
                  >
                    {cell.day}
                  </span>

                  <div className="flex flex-col gap-1">
                    {entries.slice(0, 3).map((entry) => (
                      <Link
                        key={entry.id}
                        to={routes.assignment(entry.id)}
                        className="bg-accent text-accent-foreground hover:bg-accent/70 truncate rounded px-1.5 py-0.5 text-xs transition-colors"
                        title={entry.label}
                      >
                        {formatTime(entry.startsAt)} {entry.label}
                      </Link>
                    ))}
                    {entries.length > 3 ? (
                      <span className="text-text-subtle px-1.5 text-xs">
                        {t('domain:calendar.more', { count: entries.length - 3 })}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
