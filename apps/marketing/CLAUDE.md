<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

Der Block oberhalb stammt von `next dev` und wird dort bei jedem Start neu
geschrieben. Nicht loeschen und nicht hineinschreiben.

**Die verbindlichen Regeln fuer dieses Repo stehen in [../../CLAUDE.md](../../CLAUDE.md).**
Lies zuerst die, dann diese Datei.

## Routen

Indexierbare Routen kommen aus `content/nav.ts` (`allRoutes`): `/`, `/funktionen`,
`/preise`, `/ueber-uns`, `/kontakt`, `/impressum`, `/datenschutz`, `/agb`.
`app/sitemap.ts` listet genau diese acht. `/pricing` ist kein Eintrag, sondern
ein 308 auf `/preise` (`next.config.ts`).

## Preise

Pakete, Preise und Wortlaute stehen nur in `content/pricing.ts`. Das Layout
unter `app/preise/page.tsx` und `components/marketing/PricingPlans.tsx` liest
sie von dort. Ein Preis wird in dieser Datei geändert, nicht in einer
Komponente. Kein Checkout und kein JSON-LD `Offer`.
