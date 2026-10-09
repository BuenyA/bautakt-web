'use client';

import { CalendarIcon } from 'lucide-react';
import { type FocusEventHandler, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { dateToIso, isoToLocalDate } from '../../lib/date-time';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { useMaskedField } from './use-masked-field';

const DEFAULT_INVALID = 'Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.';
const DEFAULT_REQUIRED = 'Dieses Feld wird benötigt.';
const DEFAULT_RANGE = 'Das Ende liegt vor dem Beginn.';
const DEFAULT_PLACEHOLDER = 'TT.MM.JJJJ';
const DEFAULT_CALENDAR = 'Kalender öffnen';
const DEFAULT_PREVIOUS = 'Vorheriger Monat';
const DEFAULT_NEXT = 'Nächster Monat';

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
 * Tippbares Datum `TT.MM.JJJJ` plus Monatskalender.
 *
 * Nach oben geht nur ein gültiger Kalendertag als `YYYY-MM-DD`, oder leer.
 */
function DatePicker({
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
  const [month, setMonth] = useState<Date>(() => selected ?? new Date());
  const [shownFor, setShownFor] = useState<string | null>(null);

  if (open && shownFor !== value) {
    setShownFor(value);
    setMonth(selected ?? new Date());
  } else if (!open && shownFor !== null) {
    setShownFor(null);
  }

  const triggerLabel = `${calendarAriaLabel}: ${ariaLabel}`;

  return (
    <div className={cn('grid gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          <PopoverAnchor asChild>
            <div className="min-w-0 flex-1">
              <Input
                ref={inputRef}
                id={id}
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
                className="tabular-nums"
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' && !disabled) {
                    event.preventDefault();
                    setOpen(true);
                  }
                }}
              />
            </div>
          </PopoverAnchor>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-input shrink-0"
              disabled={disabled}
              aria-label={triggerLabel}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <CalendarIcon />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          align="start"
          className="w-auto p-0"
          onOpenAutoFocus={(event) => {
            const root = event.currentTarget;
            if (!(root instanceof HTMLElement)) return;
            const day = root.querySelector<HTMLElement>(
              '[data-selected="true"] button, [data-today="true"] button',
            );
            if (!day) return;
            event.preventDefault();
            day.focus();
          }}
        >
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            previousMonthLabel={previousMonthLabel}
            nextMonthLabel={nextMonthLabel}
            onSelect={(day) => {
              if (!day) return;
              field.commit(dateToIso(day));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {field.message ? (
        <p id={field.messageId} role="alert" className="text-destructive text-sm">
          {field.message}
        </p>
      ) : null}
    </div>
  );
}

export { DatePicker };
