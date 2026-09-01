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
  if (!trimmed) return fallback;

  // Auch ein nicht-leerer Wert kann unbrauchbar sein. `bautakt.com` ohne Schema
  // ist ein naheliegender Vertipper im Vercel-Formular — und `new URL()` wirft
  // darauf genauso wie auf den leeren String. Der Build darf daran nicht
  // scheitern, aber der Fehler muss im Build-Log sichtbar sein.
  try {
    void new URL(trimmed);
    return trimmed;
  } catch {
    console.warn(
      `[site] NEXT_PUBLIC_* enthaelt keine gueltige URL: "${trimmed}". ` +
        `Fallback auf ${fallback}. Absolute URL mit Schema erwartet, z. B. https://bautakt.com`,
    );
    return fallback;
  }
}

// Pre-go-live-Fallback: Production-Alias, nicht bautakt.com (IONOS-Parking).
// Go-live setzt NEXT_PUBLIC_SITE_URL=https://bautakt.com in Vercel + Redeploy.
export const SITE_URL = urlOrFallback(
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://bautakt-web-marketing.vercel.app',
);
export const APP_URL = urlOrFallback(process.env.NEXT_PUBLIC_APP_URL, 'https://app.bautakt.com');

/** Der einzige Host, unter dem die Seite oeffentlich sichtbar sein soll. */
const PRODUCTION_HOST = 'bautakt.com';

/**
 * Ob dieses Deployment die oeffentliche Produktionsseite ist.
 *
 * ⚠️ Steuert die Indexierung. Ein Vercel-**Production**-Deployment ist auch auf
 * einer `.vercel.app`-Domain fuer Google erreichbar — nur *Preview*-Deployments
 * bekommen automatisch `X-Robots-Tag: noindex`. Ohne diese Pruefung wuerde die
 * Entwicklungsfassung mitsamt Platzhalter-Preisen indexiert und spaeter mit der
 * echten Domain um dieselben Inhalte konkurrieren. Meta und robots.txt allein
 * reichen nicht — `next.config.ts` setzt deshalb zusaetzlich `X-Robots-Tag`.
 *
 * ⚠️ Bewusst nicht gegen `SITE_URL` geprueft, sondern gegen die **rohe** Variable.
 * `SITE_URL` faellt pre-go-live auf den `.vercel.app`-Alias zurueck — der ist
 * bewusst *nicht* die oeffentliche Domain. Wuerde hier `SITE_URL` benutzt, waere
 * die Gate-Logik an den Fallback gekoppelt; die Freigabe muss aber nur greifen,
 * wenn die **rohe** Env explizit auf `bautakt.com` / `www.bautakt.com` steht.
 *
 * Indexierung ist deshalb eine ausdrueckliche Entscheidung: sie verlangt, dass
 * `NEXT_PUBLIC_SITE_URL` explizit auf die Produktionsdomain gesetzt ist. Alles
 * andere — fehlend, leer, unlesbar, fremde Domain (inkl. `.vercel.app`) —
 * bedeutet „nicht indexieren". Dieselbe Richtung wie `hasPermission` in
 * @bautakt/core: im Zweifel die geschlossene Variante.
 *
 * Die Kehrseite gehoert auf die Go-live-Checkliste: ohne gesetzte Variable
 * bleibt auch die echte Seite auf `noindex`. Siehe wiki/pages/deployment-vercel.md.
 */
export const IS_PRODUCTION_SITE = ((): boolean => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return false;

  try {
    const { hostname } = new URL(raw);
    return hostname === PRODUCTION_HOST || hostname === `www.${PRODUCTION_HOST}`;
  } catch {
    return false;
  }
})();

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
