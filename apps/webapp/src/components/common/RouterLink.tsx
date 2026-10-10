import { Link, type LinkProps } from '@fluentui/react-components';
import type * as React from 'react';

import { useRouterLink } from './useRouterLink';

/**
 * Fluent-`Link` auf eine Route der App. Navigiert clientseitig; Strg-Klick
 * öffnet einen neuen Tab.
 *
 * `stopPropagation` für Links in klickbaren Tabellenzeilen: sonst löste der
 * Link-Klick zusätzlich den Zeilenklick aus.
 */
export function RouterLink({
  to,
  appearance,
  inline,
  className,
  stopPropagation = false,
  children,
}: {
  to: string;
  appearance?: LinkProps['appearance'];
  inline?: boolean;
  className?: string;
  stopPropagation?: boolean;
  children?: React.ReactNode;
}) {
  const link = useRouterLink(to);
  return (
    <Link
      href={link.href}
      appearance={appearance}
      inline={inline}
      className={className}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        link.onClick(event);
      }}
    >
      {children}
    </Link>
  );
}
