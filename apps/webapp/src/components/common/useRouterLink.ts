import type * as React from 'react';
import { useHref, useLinkClickHandler } from 'react-router';

/**
 * `href` und `onClick` für ein Fluent-Bauteil, das als `<a>` rendert
 * (`Button as="a"`, `Link`, `NavItem`, `BreadcrumbButton`).
 *
 * Fluent kennt keine Router-Links, nur `href`. Ein nackter `href` lädt die
 * Seite neu und verliert den Query-Cache. React Routers Klick-Handler
 * navigiert clientseitig und lässt Strg-/Mittelklick (neuer Tab) in Ruhe.
 */
export function useRouterLink(to: string): {
  href: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
} {
  const href = useHref(to);
  const handleClick = useLinkClickHandler(to);
  return {
    href,
    onClick: (event) => handleClick(event as unknown as React.MouseEvent<HTMLAnchorElement>),
  };
}
