import {
  Button,
  type ButtonProps,
  makeStyles,
  mergeClasses,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import * as React from 'react';

/**
 * Knopf für endgültige Aktionen (Löschen, Stornieren).
 *
 * Fluent hat keine eigene Danger-Variante. Das ist ein Primary-Button auf den
 * Status-Danger-Tokens des Themes, keine eigene Farbe: im Dunkelmodus zieht er
 * mit, und gesperrt sieht er aus wie jeder gesperrte Fluent-Knopf.
 */
const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorStatusDangerBackground3Hover,
      color: tokens.colorNeutralForegroundOnBrand,
    },
    ':hover:active': {
      backgroundColor: tokens.colorStatusDangerBackground3Pressed,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
});

export const DangerButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function DangerButton(
  { className, disabled, disabledFocusable, ...props },
  ref,
) {
  const styles = useStyles();
  const inactive = disabled || disabledFocusable;
  return (
    <Button
      ref={ref as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
      appearance="primary"
      disabled={disabled}
      disabledFocusable={disabledFocusable}
      className={mergeClasses(!inactive && styles.root, className)}
      {...props}
    />
  );
});

/**
 * Löschen auf Seiten und in Panels: roter Block, nur der Mülleimer, damit der
 * Knopf neben Zurück und Bearbeiten wenig Platz nimmt (Owner-Wunsch). Der Text
 * steht als Tooltip und Name für Screenreader dran; die Rückfrage danach trägt
 * ihn ausgeschrieben, ihr Bestätigungsknopf bleibt ein `DangerButton` mit Text.
 */
export const DeleteButton = React.forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  function DeleteButton({ label, ...props }, ref) {
    // Symbol und Inhalt fest: ein Text würde den Knopf wieder breit machen.
    return (
      <Tooltip content={label} relationship="label">
        <DangerButton ref={ref} {...props} icon={<DeleteRegular />}>
          {null}
        </DangerButton>
      </Tooltip>
    );
  },
);

/**
 * Löschen als reines Symbol, z. B. in einer Tabellenzeile oder auf einer
 * Foto-Kachel: rotes Symbol ohne roten Block, damit eine lange Liste ruhig
 * bleibt. Standard ist `subtle`; auf Bildern `appearance="secondary"`, damit
 * das Symbol eine helle Fläche hat. Als roter Block `DeleteButton`.
 */
const useIconStyles = makeStyles({
  root: {
    color: tokens.colorStatusDangerForeground1,
    ':hover': { color: tokens.colorStatusDangerForeground1 },
    ':hover:active': { color: tokens.colorStatusDangerForeground1 },
    '& .fui-Button__icon': { color: tokens.colorStatusDangerForeground1 },
  },
});

export const DangerIconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function DangerIconButton({ className, disabled, disabledFocusable, ...props }, ref) {
    const styles = useIconStyles();
    const inactive = disabled || disabledFocusable;
    return (
      <Button
        ref={ref as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
        appearance="subtle"
        disabled={disabled}
        disabledFocusable={disabledFocusable}
        className={mergeClasses(!inactive && styles.root, className)}
        {...props}
      />
    );
  },
);
