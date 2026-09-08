/** Zentrale Adressen; Umgebungsvariablen bleiben explizit für Nexts Ersetzung. */
function address(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  try {
    return new URL(raw.trim()).toString().replace(/\/$/, '');
  } catch {
    console.warn('[Marketing] Ungültige URL-Konfiguration, verwende Vorschauadresse.');
    return fallback;
  }
}
export const SITE_URL = address(
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://bautakt-web-marketing.vercel.app',
);
export const APP_URL = address(
  process.env.NEXT_PUBLIC_APP_URL,
  'https://bautakt-webapp.vercel.app',
);
export const LOGIN_URL = `${APP_URL}/login`;
export const SUPPORT_EMAIL = 'support@bautakt.de';
/** Nur die ausdrücklich konfigurierte Hauptdomain darf indexiert werden. */
export const IS_PRODUCTION_SITE = (() => {
  try {
    return ['bautakt.com', 'www.bautakt.com'].includes(
      new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').hostname,
    );
  } catch {
    return false;
  }
})();
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
export const publicPaths = [
  '/',
  '/funktionen',
  '/preise',
  '/ueber-uns',
  '/kontakt',
  '/impressum',
  '/datenschutz',
  '/agb',
];
export const navigation = [
  { href: '/funktionen', key: 'site:nav.product' },
  { href: '/preise', key: 'site:nav.prices' },
  { href: '/ueber-uns', key: 'site:nav.about' },
  { href: '/kontakt', key: 'site:nav.contact' },
] as const;
export const legalNavigation = [
  { href: '/impressum', key: 'site:legal.imprint' },
  { href: '/datenschutz', key: 'site:legal.privacy' },
  { href: '/agb', key: 'site:legal.terms' },
] as const;
