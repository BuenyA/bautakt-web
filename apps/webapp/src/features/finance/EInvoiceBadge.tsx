import { StatusBadge } from '@bautakt/ui';
import { Tooltip } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

/**
 * Kennzeichen „E-Rechnung“ (ZUGFeRD/XRechnung), in Tabellen neben der Nummer
 * und im Kopf eines Belegs. Grüne Marke mit Haken nach Vorlage des Owners
 * (17.10.2026). Ohne E-Rechnung erscheint nichts.
 */
export function EInvoiceBadge() {
  const { t } = useTranslation();
  return (
    <Tooltip content={t('domain:eInvoice.badgeTooltip')} relationship="description">
      <span className="inline-flex">
        <StatusBadge tone="success" icon={<CheckmarkCircleRegular />}>
          {t('domain:eInvoice.badge')}
        </StatusBadge>
      </span>
    </Tooltip>
  );
}
