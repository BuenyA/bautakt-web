'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '../../lib/cn';
import { buttonVariants } from './button';

/**
 * Monatskalender.
 *
 * `date-fns/locale/de` schreibt Monat und Wochentage deutsch und legt den
 * Wochenanfang auf Montag. `weekStartsOn={1}` hält das fest, auch wenn jemand
 * die Locale später austauscht. Die Schaltflächen „Heute“ und „ausgewählt“
 * stehen hier, weil die date-fns-Locale nur die Datumsnamen liefert.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  previousMonthLabel = 'Vorheriger Monat',
  nextMonthLabel = 'Nächster Monat',
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'relative flex flex-col',
        month: 'flex flex-col gap-3',
        month_caption: 'flex h-8 items-center justify-center px-8',
        caption_label: 'text-sm font-medium capitalize',
        nav: 'absolute inset-x-3 top-3 flex items-center justify-between',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8'),
        button_next: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8'),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground w-9 text-center text-xs font-normal',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center',
        day_button: cn(
          'inline-flex size-9 items-center justify-center rounded-md text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none',
          'aria-selected:bg-primary aria-selected:text-primary-foreground',
          'aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground',
        ),
        today: '[&>button]:ring-primary [&>button]:ring-1',
        outside: '[&>button]:text-muted-foreground [&>button]:opacity-50',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClass }) => {
          const Icon = orientation === 'left' ? ChevronLeftIcon : ChevronRightIcon;
          return <Icon aria-hidden className={cn('size-4', iconClass)} />;
        },
      }}
      {...props}
      locale={de}
      weekStartsOn={1}
      labels={{
        labelPrevious: () => previousMonthLabel,
        labelNext: () => nextMonthLabel,
        labelDayButton: (date, modifiers) => {
          let label = format(date, 'PPPP', { locale: de });
          if (modifiers.today) label = `Heute, ${label}`;
          if (modifiers.selected) label = `${label}, ausgewählt`;
          return label;
        },
      }}
    />
  );
}

export { Calendar };
