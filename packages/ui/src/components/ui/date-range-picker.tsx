'use client';

import { cn } from '../../lib/cn';
import { DatePicker, type DatePickerProps } from './date-picker';
import { Label } from './label';

export type DateRangePickerProps = {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startId?: string;
  endId?: string;
  startLabel: string;
  endLabel: string;
  startAriaLabel: string;
  endAriaLabel: string;
  disabled?: boolean;
  startRequired?: boolean;
  endRequired?: boolean;
  className?: string;
  placeholder?: string;
  invalidMessage?: string;
  requiredMessage?: string;
  rangeMessage?: string;
  calendarAriaLabel?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
};

/**
 * Zwei Datumsfelder. Das Ende darf nicht vor dem Beginn liegen; derselbe Tag gilt.
 */
function DateRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  startId,
  endId,
  startLabel,
  endLabel,
  startAriaLabel,
  endAriaLabel,
  disabled,
  startRequired,
  endRequired,
  className,
  placeholder,
  invalidMessage,
  requiredMessage,
  rangeMessage,
  calendarAriaLabel,
  previousMonthLabel,
  nextMonthLabel,
}: DateRangePickerProps) {
  const shared: Partial<DatePickerProps> = {
    disabled,
    placeholder,
    invalidMessage,
    requiredMessage,
    calendarAriaLabel,
    previousMonthLabel,
    nextMonthLabel,
  };

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <div className="grid gap-2">
        <Label htmlFor={startId}>{startLabel}</Label>
        <DatePicker
          {...shared}
          id={startId}
          value={start}
          onChange={onStartChange}
          required={startRequired}
          aria-label={startAriaLabel}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={endId}>{endLabel}</Label>
        <DatePicker
          {...shared}
          id={endId}
          value={end}
          onChange={onEndChange}
          required={endRequired}
          aria-label={endAriaLabel}
          earliest={start}
          rangeMessage={rangeMessage}
        />
      </div>
    </div>
  );
}

export { DateRangePicker };
