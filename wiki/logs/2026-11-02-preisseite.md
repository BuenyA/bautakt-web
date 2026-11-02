# 2026-11-02 — Preisseite `/preise`

Owner-Beschluss vom 1.11.2026, Details 2.11.2026: die Marketing-Seite zeigt
die Pakete wieder. Issue [#283](https://github.com/BuenyA/bautakt-web/issues/283).

## Was geändert wurde

`/preise` ist eine Seite. `/pricing` antwortet mit 308 auf `/preise`, nicht
mehr auf `/`. „Preise“ steht in `mainNav` und damit im Header ab `md`, im
Footer und in der Sitemap. Die Sitemap listet acht Routen.

Beträge, Merkmale und Wortlaute stehen in `apps/marketing/content/pricing.ts`.
Start 19 € / 15 €, Betrieb 99 € / 89 €, Team 199 € / 179 €, Business 299 €,
399 € und 499 € ohne Jahrespreis. Betrieb trägt das Badge „Beliebt“ und
einen Rahmen. Der Umschalter steht auf „Jährlich“, serverseitig, ohne
Flackern. Business bleibt bei jedem Stand gleich.

Kein Checkout, kein Registrier-Link, kein JSON-LD `Offer`, kein Teaser auf
der Startseite. Die Knöpfe der Pakete führen auf `/kontakt`. Das
Gründerprogramm verlinkt per E-Mail an `site.supportEmail`. Den Wortlaut
prüft Recht noch.

## Warum

Die Seite soll die beschlossenen Pakete nennen und zur Kontaktaufnahme
führen. Verkauft wird auf der Seite nichts, weil es noch keinen Checkout
gibt.

Die Sperre vom
[2026-10-09](2026-10-09-marketing-nicht-kommerziell.md) galt, solange die
öffentliche Seite nicht kommerziell wirken durfte. Registrierung bleibt
unverlinkt. Die Homepage-Reihenfolge aus
[2026-09-06](2026-09-06-marketing-design-spec-v44.md) bekommt den
Preisbereich nicht zurück: Preise leben nur auf `/preise`.

## Verweise

- [deployment-vercel.md](../pages/deployment-vercel.md)
