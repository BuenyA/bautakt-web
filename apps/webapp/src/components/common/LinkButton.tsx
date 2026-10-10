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
  children,
}: {
  to: string;
  appearance?: ButtonProps['appearance'];
  size?: ButtonProps['size'];
  icon?: React.ReactElement;
  className?: string;
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
    >
      {children}
    </Button>
  );
}
