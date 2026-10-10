import { Input } from '@fluentui/react-components';
import { type FocusEventHandler, useRef } from 'react';

import { cn } from '../../lib/cn';
import { FieldMessage } from './field-message';
import { useMaskedField } from './use-masked-field';

const DEFAULT_INVALID = 'Bitte eine Uhrzeit im Format HH:MM eingeben.';
const DEFAULT_REQUIRED = 'Dieses Feld wird benötigt.';
const DEFAULT_PLACEHOLDER = 'HH:MM';

export type TimeInputProps = {
  id?: string;
  /** `HH:MM` oder leer. */
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
  className?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

/**
 * Uhrzeit als Text, 24 Stunden, unabhängig von der Browsersprache.
 *
 * Kein `type="time"`: das zeigt bei englischem Browser „07:00 AM“.
 * Nachtschicht und mehrtägige Einsätze prüft das Formular, nicht dieses Feld —
 * eine einzelne Uhrzeit hat kein Ende.
 */
export function TimeInput({
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
  className,
  onBlur,
}: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const field = useMaskedField({
    kind: 'time',
    value,
    onChange,
    required,
    invalidMessage,
    requiredMessage,
    rangeMessage: '',
    externalDescribedBy: ariaDescribedBy,
    onBlur,
    inputRef,
  });

  return (
    <div className={cn('grid gap-1', className)}>
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
        input={{ className: 'tabular-nums' }}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
      />
      <FieldMessage id={field.messageId} message={field.message} />
    </div>
  );
}
