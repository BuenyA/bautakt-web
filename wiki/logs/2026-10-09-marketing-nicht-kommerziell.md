# 2026-10-09 — Marketing ohne Preise und ohne Registrierung

Owner-Entscheidung: bis zum ersten Kunden kein Vercel-Pro-Abo. Die öffentliche
Marketing-Seite (Vercel-Projekt `bautakt-web-marketing`, Hobby) muss
nicht-kommerziell wirken.

## Was geändert wurde

Preise sind von der Marketing-Seite weg: Sektion, Tarifkarten, Navigation,
Footer, FAQ, Vertrauenszeile „Monatlich kündbar“, JSON-LD `Offer`. Die Dateien
`content/pricing.ts`, `PricingFeatured.tsx`, `PricingTable.tsx` und
`app/preise/page.tsx` sind gelöscht.

`/preise` und `/pricing` antworten mit 308 auf `/` (`next.config.ts`,
`permanent: true`). Die Sitemap listet sieben Routen, nicht mehr acht.

Signup-Texte („Kostenlos testen“, „Konto anlegen“) und `REGISTER_URL` sind
weg. Wo ein Knopf bleiben musste, steht „Anmelden“ (`LOGIN_URL`) oder
„Mehr erfahren“ (`#funktionen`). Die Web-App, einschließlich `/registrieren`
und dem Link auf der Login-Seite, ist unangetastet.

## Warum

Eine Seite mit Tarifen und Registrierung wirkt kommerziell. Hobby-Production
darf das bis zum ersten Kunden nicht.

Die Homepage-Reihenfolge aus
[2026-09-06](2026-09-06-marketing-design-spec-v44.md) (Pricing Featured zwischen
Features und FAQ) gilt dafür nicht mehr.

Issue: [#136](https://github.com/BuenyA/bautakt-web/issues/136).

## Verweise

- [deployment-vercel.md](../pages/deployment-vercel.md)
