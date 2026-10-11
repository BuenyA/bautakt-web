import { Tab, TabList } from '@fluentui/react-components';

export type ListFilterChipOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

/**
 * Filter einer Liste (Status, Art, Zeitraum) als Fluent-`TabList`.
 *
 * Alle Listenfilter der App sehen gleich aus: dieselbe `TabList` wie bei
 * Aufträge/Angebote. Bis 2026-10-10 waren das eigene Pill-Knöpfe in Electric.
 * Der Name bleibt, damit die Seiten unverändert bleiben.
 */
export function ListFilterChips<T extends string>({
  value,
  onValueChange,
  options,
  label,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ListFilterChipOption<T>[];
  /** `aria-label` der Gruppe. */
  label: string;
  /** Ohne Wirkung seit Fluent; die TabList scrollt nicht, sie bricht nicht um. */
  nowrap?: boolean;
}) {
  return (
    <TabList
      selectedValue={value}
      onTabSelect={(_, data) => onValueChange(data.value as T)}
      aria-label={label}
    >
      {options.map((option) => (
        <Tab key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Tab>
      ))}
    </TabList>
  );
}
