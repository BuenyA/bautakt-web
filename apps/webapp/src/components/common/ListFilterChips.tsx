import { cn } from '@bautakt/ui';

export type ListFilterChipOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

/**
 * Pattern A — Status-/Typ-/Zeitraum-Chips (Mobile `FilterChip`).
 *
 * Aktiv ist Electric (`bg-primary`), inaktiv die Input-Fläche. Das ist
 * absichtlich nicht der graue `Tabs`-Pill (Pattern B, nur Auftrags-Kind).
 */
export function ListFilterChips<T extends string>({
  value,
  onValueChange,
  options,
  label,
  nowrap = false,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ListFilterChipOption<T>[];
  /** `aria-label` der Gruppe. */
  label: string;
  /** Eine Zeile, horizontal scrollbar, wenn die Labels nicht nebeneinander passen. */
  nowrap?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center gap-2',
        nowrap ? 'w-full min-w-0 flex-nowrap overflow-x-auto sm:w-auto' : 'flex-wrap',
      )}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-100',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              'disabled:pointer-events-none disabled:opacity-50',
              pressed
                ? 'bg-primary text-primary-foreground'
                : 'bg-input text-muted-foreground hover:bg-surface',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
