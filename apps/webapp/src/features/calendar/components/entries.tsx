import { mergeClasses } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { routes } from '@/lib/routes';

import type { Occurrence } from '../calendarModel';
export type { EntryTone } from './entryStyles';
import { type EntryTone, useEntryStyles, useToneClass } from './entryStyles';

/** Ein Eintrag im Kalender: Termin, Einsatz oder eigene Abwesenheit. */
export type CalendarEntry = {
  key: string;
  kind: 'event' | 'assignment' | 'absence';
  tone: EntryTone;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  occurrence?: Occurrence;
  assignmentId?: string;
  /** Abwesenheit noch nicht genehmigt. */
  pending?: boolean;
};

export function ToneDot({ tone }: { tone: EntryTone }) {
  const styles = useEntryStyles();
  const toneClass = {
    me: styles.dotMe,
    all: styles.dotAll,
    assignment: styles.dotAssignment,
    absence: styles.dotAbsence,
  }[tone];
  return (
    <span aria-hidden className={mergeClasses(styles.dot, toneClass, 'inline-block shrink-0')} />
  );
}

/**
 * Ein Eintrag als passendes Element: Termin = Knopf (öffnet das Panel),
 * Einsatz = Link auf seine Seite, Abwesenheit = nur Text.
 */
export function EntryElement({
  entry,
  className,
  label,
  onOpenEvent,
  children,
}: {
  entry: CalendarEntry;
  className?: string;
  label: string;
  onOpenEvent: (occurrence: Occurrence) => void;
  children: ReactNode;
}) {
  const styles = useEntryStyles();
  const toneClass = useToneClass(entry.tone, entry.pending);
  const classes = mergeClasses(toneClass, className);

  if (entry.kind === 'event' && entry.occurrence) {
    const occurrence = entry.occurrence;
    return (
      <button
        type="button"
        className={mergeClasses(classes, styles.interactive, 'text-left')}
        title={label}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onOpenEvent(occurrence);
        }}
      >
        {children}
      </button>
    );
  }
  if (entry.kind === 'assignment' && entry.assignmentId) {
    return (
      <Link
        to={routes.assignment(entry.assignmentId)}
        className={mergeClasses(classes, styles.interactive)}
        title={label}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </Link>
    );
  }
  return (
    <span className={classes} title={label}>
      {children}
    </span>
  );
}
