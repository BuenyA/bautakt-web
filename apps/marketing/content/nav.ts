export type NavItem = { href: string; label: string };

export const mainNav: NavItem[] = [
  { href: '/funktionen', label: 'Funktionen' },
  { href: '/preise', label: 'Preise' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/kontakt', label: 'Kontakt' },
];

export const legalNav: NavItem[] = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/agb', label: 'AGB' },
];

/** Alle indexierbaren Routen. Quelle fuer sitemap.ts. */
export const allRoutes: string[] = [
  '/',
  ...mainNav.map((item) => item.href),
  ...legalNav.map((item) => item.href),
];
