import { StatusBadge } from '@bautakt/ui';
import { Button, Text } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

/** Adressen als Marken, wahlweise mit Entfernen-Knopf. */
export function AddressList({
  addresses,
  emptyText,
  onRemove,
  disabled,
}: {
  addresses: readonly string[];
  emptyText: string;
  onRemove?: (address: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (addresses.length === 0) {
    return <Text className="text-muted-foreground">{emptyText}</Text>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {addresses.map((address) => (
        <li key={address} className="flex items-center gap-1">
          <StatusBadge tone="outline">{address}</StatusBadge>
          {onRemove ? (
            <Button
              appearance="subtle"
              size="small"
              icon={<DismissRegular />}
              disabled={disabled}
              aria-label={t('domain:mailSettings.removeAddress', { address })}
              title={t('domain:mailSettings.removeAddress', { address })}
              onClick={() => onRemove(address)}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
