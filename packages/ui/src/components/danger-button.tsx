import {
  Button,
  type ButtonProps,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
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
