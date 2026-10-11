/**
 * Impressum, Datenschutz und AGB leben auf der Marketing-Seite — eine Quelle,
 * kein zweiter Text in der Web-App (#81). Die Web-App verlinkt nur dorthin.
 *
 * ⚠️ Pre-go-live derselbe Fallback wie `SITE_URL` in
 * `apps/marketing/lib/site.ts`: der Vercel-Alias, nicht bautakt.com (dort
 * liegt noch die Parkseite). Go-live setzt `VITE_SITE_URL=https://bautakt.com`
 * im Vercel-Projekt `bautakt-webapp` — Vite ersetzt den Wert beim Build, es
 * braucht also einen Redeploy.
 */
const FALLBACK_SITE_URL = 'https://bautakt-web-marketing.vercel.app';

function siteUrl(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return FALLBACK_SITE_URL;
  try {
    return new URL(trimmed).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

const SITE_URL = siteUrl(import.meta.env.VITE_SITE_URL);

export type LegalPage = 'imprint' | 'privacy' | 'terms';

const LEGAL_PATHS: Record<LegalPage, string> = {
  imprint: '/impressum',
  privacy: '/datenschutz',
  terms: '/agb',
};

export const LEGAL_PAGES: readonly LegalPage[] = ['imprint', 'privacy', 'terms'];

export function legalUrl(page: LegalPage): string {
  return `${SITE_URL}${LEGAL_PATHS[page]}`;
}
