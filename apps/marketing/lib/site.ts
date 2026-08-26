/**
 * Zentrale Adressen und Stammdaten der Marketing-Seite.
 *
 * ⚠️ Jeder Link auf die Web-App laeuft ueber diese Datei. Die App-Domain steht
 * deshalb genau einmal im Code. Niemals eine app.bautakt.com-URL direkt in eine
 * Komponente schreiben — sonst zeigen Preview-Deployments auf die Produktion.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bautakt.com';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bautakt.com';

export const LOGIN_URL = `${APP_URL}/login`;
export const REGISTER_URL = `${APP_URL}/registrieren`;

export const site = {
  name: 'Bautakt',
  tagline: 'Auftraege, Zeiten und Rechnungen an einem Ort',
  description:
    'Bautakt buendelt Auftragsverwaltung, Zeiterfassung, Material und Rechnungsstellung fuer Handwerks- und Baubetriebe — auf der Baustelle wie im Buero.',
  locale: 'de_DE',
  supportEmail: 'support@bautakt.de',
} as const;

/** Absolute URL fuer canonical-Tags und die Sitemap. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
