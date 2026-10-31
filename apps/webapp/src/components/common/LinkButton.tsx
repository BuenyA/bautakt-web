import { Button, type ButtonProps } from '@fluentui/react-components';
import type * as React from 'react';

import { useRouterLink } from './useRouterLink';

/**
 * Fluent-`Button`, der zu einer Route der App führt. Rendert ein echtes `<a>`:
 * Screenreader sagen „Link“, Strg-Klick öffnet einen neuen Tab.
 */
export function LinkButton({
  to,
  appearance,
  size,
  icon,
  className,
  'aria-label': ariaLabel,
  children,
}: {
  to: string;
  appearance?: ButtonProps['appearance'];
  size?: ButtonProps['size'];
  icon?: React.ReactElement;
  className?: string;
  /** Pflicht, wenn der Knopf nur ein Symbol zeigt. */
  'aria-label'?: string;
  children?: React.ReactNode;
}) {
  const link = useRouterLink(to);
  return (
    <Button
      as="a"
      href={link.href}
      onClick={link.onClick}
      appearance={appearance}
      size={size}
      icon={icon}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}
