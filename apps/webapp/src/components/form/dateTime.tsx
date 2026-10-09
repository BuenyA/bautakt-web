import {
  DatePicker as UiDatePicker,
  type DatePickerProps,
  DateRangePicker as UiDateRangePicker,
  type DateRangePickerProps,
  TimeInput as UiTimeInput,
  type TimeInputProps,
} from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

/** Datum `TT.MM.JJJJ`. Der Wert bleibt `YYYY-MM-DD`. */
export function DatePicker(props: DatePickerProps) {
  const { t } = useTranslation();
  return (
    <UiDatePicker
      placeholder={t('validation:datePlaceholder')}
      invalidMessage={t('validation:date')}
      requiredMessage={t('validation:required')}
      calendarAriaLabel={t('validation:openCalendar')}
      previousMonthLabel={t('validation:previousMonth')}
      nextMonthLabel={t('validation:nextMonth')}
      rangeMessage={t('validation:endBeforeStart')}
      {...props}
    />
  );
}

/** Zwei Daten. Das Ende darf nicht vor dem Beginn liegen. */
export function DateRangePicker(props: DateRangePickerProps) {
  const { t } = useTranslation();
  return (
    <UiDateRangePicker
      placeholder={t('validation:datePlaceholder')}
      invalidMessage={t('validation:date')}
      requiredMessage={t('validation:required')}
      calendarAriaLabel={t('validation:openCalendar')}
      previousMonthLabel={t('validation:previousMonth')}
      nextMonthLabel={t('validation:nextMonth')}
      rangeMessage={t('validation:endBeforeStart')}
      {...props}
    />
  );
}

/** Uhrzeit `HH:MM`, 24 Stunden, unabhängig von der Browsersprache. */
export function TimeInput(props: TimeInputProps) {
  const { t } = useTranslation();
  return (
    <UiTimeInput
      placeholder={t('validation:timePlaceholder')}
      invalidMessage={t('validation:time')}
      requiredMessage={t('validation:required')}
      {...props}
    />
  );
}
