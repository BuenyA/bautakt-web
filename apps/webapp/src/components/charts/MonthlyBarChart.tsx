import { formatMoney, formatMonthShort, type MonthlyPoint } from '@bautakt/finance';
import { cn } from '@bautakt/ui';
import { useId, useState } from 'react';

/**
 * Monatsreihe als Balken.
 *
 * Bewusst ohne Diagramm-Bibliothek: eine Reihe aus zwoelf Werten braucht keine
 * 40 kB Abhaengigkeit, und so tragen die Balken dieselben Tokens wie der Rest
 * der Oberflaeche — auch im Dunkelmodus.
 *
 * Eine Serie, also keine Legende: der Titel ueber dem Diagramm benennt sie.
 * Beschriftet wird nur der hoechste Wert; eine Zahl an jedem Balken wiederholt
 * nur, was die Tabelle darunter ohnehin genauer sagt.
 *
 * Monate ohne Wert bleiben als leere Spalte stehen — sie wegzulassen wuerde die
 * Reihe gleichmaessiger aussehen lassen, als sie ist.
 */
export function MonthlyBarChart({
  points,
  className,
  emptyLabel,
}: {
  points: MonthlyPoint[];
  className?: string;
  emptyLabel: string;
}) {
  const titleId = useId();
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(...points.map((point) => point.minor), 0);
  const peak = points.find((point) => point.minor === max && max > 0);
  // Kopfhoehe fuer die Beschriftung: ohne sie steht die Zahl des hoechsten
  // Balkens auf dem Balken statt darueber und ist nicht mehr zu lesen.
  const scale = max * 1.18;

  if (max === 0) {
    return (
      <p className={cn('text-muted-foreground py-8 text-center text-sm', className)}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className="flex h-48 items-end gap-1.5"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setHovered(null)}
      >
        {points.map((point) => {
          const height = scale > 0 ? Math.max(2, Math.round((point.minor / scale) * 100)) : 2;
          const isHovered = hovered === point.month;
          const isPeak = peak?.month === point.month;

          return (
            <div
              key={point.month}
              className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
              onMouseEnter={() => setHovered(point.month)}
            >
              {/* Ueber dem Balken und bewusst breiter als die Spalte: bei
                  zwoelf Monaten ist eine Spalte schmaler als „23.032,45 €",
                  und ein abgeschnittener Betrag ist schlimmer als keiner. */}
              {isHovered || isPeak ? (
                <span
                  className={cn(
                    'pointer-events-none absolute left-1/2 z-10 w-max -translate-x-1/2 text-xs tabular-nums',
                    isHovered ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                  style={{ bottom: `calc(${height}% + 4px)` }}
                >
                  {formatMoney(point.minor)}
                </span>
              ) : null}

              <div
                // 4px runde Enden oben, unten buendig auf der Grundlinie: ein
                // Balken haengt an der Achse, er schwebt nicht.
                className={cn(
                  'bg-primary w-full rounded-t-[4px] transition-opacity',
                  hovered && !isHovered ? 'opacity-50' : 'opacity-100',
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="border-border flex gap-1.5 border-t pt-1.5">
        {points.map((point) => (
          <span
            key={point.month}
            className={cn(
              'text-text-subtle min-w-0 flex-1 truncate text-center text-[0.6875rem] tabular-nums',
              hovered === point.month && 'text-foreground',
            )}
          >
            {formatMonthShort(point.month)}
          </span>
        ))}
      </div>

      <span id={titleId} className="sr-only">
        {points
          .map((point) => `${formatMonthShort(point.month)}: ${formatMoney(point.minor)}`)
          .join(', ')}
      </span>
    </div>
  );
}
