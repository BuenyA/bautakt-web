'use client';

import {
  type FocusEvent,
  type FocusEventHandler,
  type RefObject,
  useEffect,
  useId,
  useState,
} from 'react';

import {
  formatGermanDate,
  maskGermanDate,
  maskTimeInput,
  parseGermanDate,
  parseIsoDay,
  parseTimeValue,
} from '../../lib/date-time';

export type MaskedKind = 'date' | 'time';

function formatStored(kind: MaskedKind, value: string): string {
  if (!value) return '';
  if (kind === 'date') return formatGermanDate(value);
  return parseTimeValue(value) ?? value;
}

function parseStored(kind: MaskedKind, text: string): string | null {
  return kind === 'date' ? parseGermanDate(text) : parseTimeValue(text);
}

function maskStored(kind: MaskedKind, raw: string): string {
  return kind === 'date' ? maskGermanDate(raw) : maskTimeInput(raw);
}

function isComplete(kind: MaskedKind, text: string): boolean {
  const trimmed = text.trim();
  return kind === 'date'
    ? /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)
    : /^\d{1,2}:\d{2}$/.test(trimmed);
}

/**
 * Textfeld, das deutsch anzeigt und nur gültige Werte nach oben gibt.
 *
 * Unfertiges Tippen bleibt lokal. `31.02.2026` und `25:00` erreichen den
 * Formularzustand nicht; die Meldung blockiert das Absenden.
 */
export function useMaskedField({
  kind,
  value,
  onChange,
  required,
  invalidMessage,
  requiredMessage,
  earliest,
  rangeMessage,
  externalDescribedBy,
  onBlur,
  inputRef,
}: {
  kind: MaskedKind;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  invalidMessage: string;
  requiredMessage: string;
  earliest?: string;
  rangeMessage: string;
  externalDescribedBy?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const messageId = useId();
  const [text, setText] = useState(() => formatStored(kind, value));
  const [blurred, setBlurred] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setBlurred(false);
    setText((current) => {
      if (value === '' && current.trim() === '') return current;
      if (parseStored(kind, current) === value) return current;
      return formatStored(kind, value);
    });
  }

  const parsed = parseStored(kind, text);
  const empty = text.trim() === '';
  const formatInvalid = !empty && parsed == null;
  const earliestDay = earliest ? parseIsoDay(earliest) : null;
  const rangeInvalid = Boolean(parsed && earliestDay && parsed < earliestDay);
  const showFormat = formatInvalid && (blurred || isComplete(kind, text));
  const showRange = !showFormat && rangeInvalid;
  const showRequired = required && empty && blurred && !showFormat;
  const message = showFormat
    ? invalidMessage
    : showRange
      ? rangeMessage
      : showRequired
        ? requiredMessage
        : null;

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    if (formatInvalid) element.setCustomValidity(invalidMessage);
    else if (rangeInvalid) element.setCustomValidity(rangeMessage);
    else if (required && empty) element.setCustomValidity(requiredMessage);
    else element.setCustomValidity('');
  }, [
    empty,
    formatInvalid,
    inputRef,
    invalidMessage,
    rangeInvalid,
    rangeMessage,
    required,
    requiredMessage,
  ]);

  function handleChange(raw: string) {
    const masked = maskStored(kind, raw);
    setText(masked);
    if (masked.trim() === '') {
      if (value !== '') onChange('');
      return;
    }
    const next = parseStored(kind, masked);
    if (next && next !== value) onChange(next);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setBlurred(true);
    if (parsed) {
      setText(formatStored(kind, parsed));
      if (parsed !== value) onChange(parsed);
    } else if (empty && value !== '') {
      onChange('');
    }
    onBlur?.(event);
  }

  function commit(next: string) {
    setBlurred(false);
    setText(formatStored(kind, next));
    if (next !== value) onChange(next);
  }

  const describedBy =
    [message ? messageId : null, externalDescribedBy].filter(Boolean).join(' ') || undefined;

  return {
    text,
    message,
    messageId,
    describedBy,
    invalid: Boolean(message),
    handleChange,
    handleBlur,
    commit,
  };
}
