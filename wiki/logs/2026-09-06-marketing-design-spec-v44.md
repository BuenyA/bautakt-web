# Marketing Design Spec v4.4

_Stand 2026-09-06._

Die Marketing-Seite (`apps/marketing`) folgt Design Spec v4.4. Inhalt und Sektionen
liegen in `content/` und den Komponenten unter `components/marketing/`. Primary-Blau
`#3B86E0` ist nur in `app/globals.css` überschrieben, damit `packages/ui` und die
Webapp unberührt bleiben. Logo-Taktbalken und Wordmark sind Anthrazit `#1C1F26`.

## Homepage-Reihenfolge

Hero+Device → TrustBar → Tagesablauf → Features-Grid → Pricing Featured → FAQ →
CTA-Band.

## SEO / Copy-Invarianten

- H1: `Aufträge, Zeiten und Rechnungen im Takt.` (mit Punkt)
- Dokumenttitel: `Bautakt | Aufträge, Zeiten und Rechnungen im Takt` (Pipe, ohne Punkt)
- Keine Gedankenstriche (em/en) in sichtbarem Fließtext
- Kein Kreditkarten-Hinweis
- Preise: „auf Anfrage“
- Hero-CTAs: Kostenlos testen → `/registrieren`, Funktionen ansehen → `/#funktionen`
- Anmelden nur im Header → `/login`

`IS_PRODUCTION_SITE`, robots und Domain-Cutover unverändert.
