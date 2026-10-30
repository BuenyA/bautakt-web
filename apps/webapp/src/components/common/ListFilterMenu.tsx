import {
  Button,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { FilterFilled, FilterRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

export type ListFilterMenuOption<T extends string> = {
  value: T;
  label: string;
  /** Anzahl passender Zeilen; 0 oder fehlend zeigt keine Zahl. */
  count?: number;
};

/**
 * Filter einer Liste als Knopf „Filter“ neben CSV und Spalten
 * (`DataTable`-Slot `actions`). Für Listen ohne Filterzeile über der Tabelle
 * (Owner 30.10.2026): Die Seite bleibt so schlicht wie die Belegliste, der
 * Filter liegt eine Ebene tiefer.
 *
 * Ist ein anderer Wert als `defaultValue` gewählt, nennt der Knopf ihn und
 * trägt das gefüllte Symbol — sonst übersieht man, dass die Liste gefiltert ist.
 */
export function ListFilterMenu<T extends string>({
  value,
  defaultValue,
  onValueChange,
  options,
}: {
  value: T;
  defaultValue: T;
  onValueChange: (value: T) => void;
  options: readonly ListFilterMenuOption<T>[];
}) {
  const { t } = useTranslation();
  const active = value !== defaultValue;
  const activeLabel = options.find((option) => option.value === value)?.label;
  const buttonLabel =
    active && activeLabel
      ? `${t('common:action.filter')}: ${activeLabel}`
      : t('common:action.filter');

  return (
    <Menu
      checkedValues={{ filter: [value] }}
      onCheckedValueChange={(_, { checkedItems }) => {
        const next = checkedItems[0] as T | undefined;
        if (next) onValueChange(next);
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button
          icon={active ? <FilterFilled /> : <FilterRegular />}
          appearance={active ? 'primary' : 'secondary'}
          aria-label={buttonLabel}
        >
          <span className="hidden sm:inline">{buttonLabel}</span>
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {options.map((option) => (
            <MenuItemRadio
              key={option.value}
              name="filter"
              value={option.value}
              secondaryContent={option.count ? String(option.count) : undefined}
            >
              {option.label}
            </MenuItemRadio>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
