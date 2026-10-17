import {
  Button,
  makeStyles,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  tokens,
} from '@fluentui/react-components';
import { QuestionCircleRegular } from '@fluentui/react-icons';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles({
  // Bewusst ein „?“ in voller Icon-Größe statt des kleinen „i“ von
  // Fluents InfoLabel (Owner 17.10.2026).
  trigger: {
    minWidth: 'auto',
    height: 'auto',
    padding: '0',
    color: tokens.colorNeutralForeground3,
    ':hover': { color: tokens.colorBrandForeground1 },
  },
  surface: {
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
});

/**
 * Fragezeichen neben einer Beschriftung; ein Klick öffnet die Erklärung.
 * `label` nennt das Feld für Screenreader („Hilfe zu …“).
 */
export function HelpButton({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <Popover withArrow positioning="above-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          className={styles.trigger}
          icon={<QuestionCircleRegular fontSize={20} />}
          aria-label={t('common:action.helpFor', { label })}
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>{children}</PopoverSurface>
    </Popover>
  );
}
