import { makeStyles, mergeClasses, tokens, Tooltip } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles({
  // Schlichtes Grün statt der Markenfarbe Blau, ohne Verlauf und Schein
  // (Owner 17.10.2026): fällt auf, ohne zu laut zu sein.
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorPaletteGreenBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorPaletteGreenBorder1}`,
    color: tokens.colorPaletteGreenForeground1,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightBold,
    lineHeight: '1',
    letterSpacing: '0',
    cursor: 'default',
    userSelect: 'none',
  },
  large: {
    width: '22px',
    height: '22px',
    fontSize: tokens.fontSizeBase200,
  },
});

/**
 * Kennzeichen „E“ für E-Rechnungen (ZUGFeRD/XRechnung), in Tabellen neben
 * der Nummer und im Kopf eines Belegs. Ohne E-Rechnung erscheint nichts.
 */
export function EInvoiceBadge({ size = 'small' }: { size?: 'small' | 'large' }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <Tooltip content={t('domain:eInvoice.badgeTooltip')} relationship="label">
      <span role="img" className={mergeClasses(styles.badge, size === 'large' && styles.large)}>
        E
      </span>
    </Tooltip>
  );
}
