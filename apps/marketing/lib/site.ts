/**
 * Zentrale Adressen und Stammdaten der Marketing-Seite.
 *
 * ⚠️ Jeder Link auf die Web-App laeuft ueber diese Datei. Die App-Domain steht
 * deshalb genau einmal im Code. Niemals eine app.bautakt.com-URL direkt in eine
 * Komponente schreiben — sonst zeigen Preview-Deployments auf die Produktion.
 */

/**
 * Faellt auf den Standard zurueck, wenn die Variable fehlt **oder leer ist**.
 *
 * ⚠️ Nicht durch `??` ersetzen. Nullish-Coalescing faengt nur `null` und
 * `undefined` — nicht den leeren String. Genau den liefert aber eine Variable,
 * die im Vercel-Dashboard angelegt, aber nicht befuellt wurde. Am 2026-08-27 hat
 * das den ersten Production-Build abgebrochen: `new URL('')` wirft.
 *
 * Der Aufrufer muss `process.env.NEXT_PUBLIC_*` woertlich uebergeben. Next
 * ersetzt diesen Ausdruck zur Build-Zeit statisch; ein dynamischer Zugriff wie
 * `process.env[name]` wuerde im Browser-Bundle leer bleiben.
 */
function urlOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const SITE_URL = urlOrFallback(process.env.NEXT_PUBLIC_SITE_URL, 'https://bautakt.com');
export const APP_URL = urlOrFallback(process.env.NEXT_PUBLIC_APP_URL, 'https://app.bautakt.com');

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
