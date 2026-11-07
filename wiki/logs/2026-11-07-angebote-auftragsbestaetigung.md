# 2026-11-07: Angebote, Auftragsbestätigung im Web

bautakt-app#187, Server-Teil in https://github.com/BuenyA/bautakt-app/pull/234. Seite: [angebote.md](../pages/angebote.md).

## Was

- Karte „Entscheidung“: Auftragsbestätigung erstellen, öffnen, versenden.
- Versanddialog kennt `order_confirmation` (eigener Betreff und Text, Kundentext in „Sie“).
- Belegart aus der Liste `/rechnungen` entfernt; Nummernkreise sperren AG und AB nach der ersten Vergabe.
- `database.types.ts` neu erzeugt, Render-Kern per `sync` aus der App (15 Dateien identisch).

## Warum so

- **In der Entscheidungskarte statt als eigener Kopf-Knopf:** Die AB gehört zur Annahme, nicht zum Angebot. Nach einer
  Zurücknahme steht sie dort mit Hinweis weiter.
- **Versenden erstellt bei Bedarf:** ein Klick weniger, und `archive` ist idempotent.

## Messung

- Lokal (erfundener Betrieb, Functions per Deno): AB00001 genau einmal, ein Objekt, eine Zeile in `quote_outputs`,
  Auswahl als Kopie; zweites Öffnen ohne neue Nummer. Probelauf-Versand, Verlauf nennt die Nummer. PDF netto
  6.348,00 €, brutto 7.554,12 € von Hand nachgerechnet.
- `npm run check` grün, `npm test` grün (Angebotsentscheidung 17 Tests, 3 neu).
