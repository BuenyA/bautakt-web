import { makeStyles, Switch, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    // Bei zweizeiligem Text steht der Schalter auf Höhe der ersten Zeile.
    alignItems: 'flex-start',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
});

/**
 * Schalter mit Titel und Erklärung, beide in Fließtextgröße. Fluents
 * `Field`-Hinweis ist 12 px groß und war dem Owner zu klein zum Lesen
 * (2026-10-30). Die Erklärung gehört zum Label, Screenreader lesen sie mit.
 */
export function SwitchRow({
  checked,
  label,
  description,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const styles = useStyles();
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      className={styles.root}
      onChange={(_, d) => onChange(d.checked)}
      label={{
        className: styles.label,
        children: (
          <>
            <Text>{label}</Text>
            {description ? <Text className="text-muted-foreground">{description}</Text> : null}
          </>
        ),
      }}
    />
  );
}
