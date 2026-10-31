import { Option } from '@fluentui/react-components';

import { Combobox } from '@/components/form/Combobox';

import { COMPANY_TYPES } from './companyValidation';

/**
 * Gewerk: die Liste ist nur eine Hilfe, jeder eigene Text gilt auch.
 *
 * `disableAutoFocus`: sonst markiert Fluent den ersten Eintrag, und Tab übernimmt
 * ihn statt des getippten Texts.
 *
 * Passt der getippte Text zu keinem Eintrag mehr, hebt Fluent die Auswahl auf
 * und meldet das über `onOptionSelect` ohne `optionText`. Das ist kein neuer
 * Wert; würde man ihn übernehmen, wäre der getippte Text weg.
 */
export function TradeCombobox({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Combobox
      freeform
      disableAutoFocus
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      selectedOptions={(COMPANY_TYPES as readonly string[]).includes(value) ? [value] : []}
      onChange={(event) => onChange(event.target.value)}
      onOptionSelect={(_, data) => {
        if (data.optionText !== undefined) onChange(data.optionText);
      }}
    >
      {COMPANY_TYPES.map((type) => (
        <Option key={type}>{type}</Option>
      ))}
    </Combobox>
  );
}
