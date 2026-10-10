import {
  Calendar,
  type CalendarStrings,
  DayOfWeek,
  FirstWeekOfYear,
  type ICalendar,
} from '@fluentui/react-calendar-compat';
import { Button, Input, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';
import { type FocusEventHandler, useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { dateToIso, germanCalendarNames, isoToLocalDate } from '../../lib/date-time';
import { FieldMessage } from './field-message';
import { useMaskedField } from './use-masked-field';

const DEFAULT_INVALID = 'Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.';
const DEFAULT_REQUIRED = 'Dieses Feld wird benötigt.';
const DEFAULT_RANGE = 'Das Ende liegt vor dem Beginn.';
const DEFAULT_PLACEHOLDER = 'TT.MM.JJJJ';
const DEFAULT_CALENDAR = 'Kalender öffnen';
const DEFAULT_PREVIOUS = 'Vorheriger Monat';
const DEFAULT_NEXT = 'Nächster Monat';

const GERMAN_NAMES = germanCalendarNames();

export type DatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD` oder leer. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  'aria-label': string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  placeholder?: string;
  invalidMessage?: string;
  requiredMessage?: string;
  calendarAriaLabel?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  /** Dieses Datum muss an `earliest` oder danach liegen. Gleicher Tag gilt. */
  earliest?: string;
  rangeMessage?: string;
  className?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

/**
 * Tippbares Datum `TT.MM.JJJJ` plus Monatskalender (Fluent `Calendar`).
 *
 * Nach oben geht nur ein gültiger Kalendertag als `YYYY-MM-DD`, oder leer.
 * Maske und Prüfung stecken in `useMaskedField`; dieses Bauteil ist nur die
 * Optik. Der Kalender wird bei jedem Öffnen neu gemountet und startet damit im
 * Monat des aktuellen Werts (oder heute), mit dem Fokus auf dem gewählten Tag.
 */
export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  required = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  placeholder = DEFAULT_PLACEHOLDER,
  invalidMessage = DEFAULT_INVALID,
  requiredMessage = DEFAULT_REQUIRED,
  calendarAriaLabel = DEFAULT_CALENDAR,
  previousMonthLabel = DEFAULT_PREVIOUS,
  nextMonthLabel = DEFAULT_NEXT,
  earliest,
  rangeMessage = DEFAULT_RANGE,
  className,
  onBlur,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // State statt Ref: der Popover braucht den Anker beim Rendern.
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const calendarRef = useRef<ICalendar>(null);
  const field = useMaskedField({
    kind: 'date',
    value,
    onChange,
    required,
    invalidMessage,
    requiredMessage,
    earliest,
    rangeMessage,
    externalDescribedBy: ariaDescribedBy,
    onBlur,
    inputRef,
  });
  const [open, setOpen] = useState(false);
  const selected = isoToLocalDate(value);

  useEffect(() => {
    if (!open) return;
    // Erst nach dem Positionieren fokussieren, sonst springt die Seite.
    const frame = requestAnimationFrame(() => calendarRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const strings: CalendarStrings = {
    ...GERMAN_NAMES,
    goToToday: 'Heute',
    prevMonthAriaLabel: previousMonthLabel,
    nextMonthAriaLabel: nextMonthLabel,
  };

  return (
    <div className={cn('grid gap-1', className)}>
      <div ref={setRow} className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id={id}
          className="min-w-0 flex-1"
          input={{ className: 'tabular-nums' }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={field.text}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid || field.invalid || undefined}
          aria-describedby={field.describedBy}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !disabled) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover
          open={open}
          onOpenChange={(_, data) => setOpen(data.open)}
          positioning={{ target: row, position: 'below', align: 'start' }}
          trapFocus
        >
          <PopoverTrigger disableButtonEnhancement>
            <Button
              icon={<CalendarRegular />}
              disabled={disabled}
              aria-label={`${calendarAriaLabel}: ${ariaLabel}`}
              aria-haspopup="dialog"
              aria-expanded={open}
            />
          </PopoverTrigger>
          <PopoverSurface aria-label={ariaLabel} className="p-0">
            <Calendar
              componentRef={calendarRef}
              value={selected}
              firstDayOfWeek={DayOfWeek.Monday}
              firstWeekOfYear={FirstWeekOfYear.FirstFourDayWeek}
              showGoToToday={false}
              isMonthPickerVisible={false}
              strings={strings}
              onSelectDate={(day) => {
                field.commit(dateToIso(day));
                setOpen(false);
                inputRef.current?.focus();
              }}
              onDismiss={() => setOpen(false)}
            />
          </PopoverSurface>
        </Popover>
      </div>
      <FieldMessage id={field.messageId} message={field.message} />
    </div>
  );
}
