# Rechnungsbereich (`/rechnungen`)

Der Leistenpunkt „Rechnungen“ (früher „Finanzen“) ist der Arbeitsplatz des Büros:
Ausgangsrechnungen schreiben, Eingangsrechnungen abarbeiten. Code in
`apps/webapp/src/features/finance/`, Rechenlogik in `packages/finance/src/invoiceDesk.ts`.

## Warum „Rechnungen“ und nicht „Buchhaltung“

Owner-Entscheidung vom 2026-10-14. Im Handwerksbetrieb schreibt das Sekretariat hier
Rechnungen und nimmt Eingangsrechnungen an (E-Rechnung). Buchungen, Konten, UStVA und
Löhne laufen über DATEV bzw. den Steuerberater. „Buchhaltung“ würde genau das versprechen.
„Finanzen“ war zu unbestimmt.

Pfade seit 2026-10-14 (Owner-Wunsch, Pfad wie Label): Übersicht `/rechnungen`, Liste der
Ausgangsrechnungen `/rechnungen/ausgang`, Belege weiter `/rechnungen/:id`. `/finanzen`
leitet auf die Übersicht um (`routes.legacyFinance`). Alte Lesezeichen auf die Liste
(`/rechnungen?status=…`) landen jetzt auf der Übersicht, ihr Filter geht verloren.

## Aufbau

- **Reiter statt Hub-Kacheln** (`FinanceLayout.tsx`): Übersicht · Ausgangsrechnungen
  (`/rechnungen/ausgang`) · Eingangsrechnungen (`/ausgaben`) · Angebote · Mahnwesen · Auswertungen.
  Die Reiter sind `financeHub.cards` in `features/hubs/hubs.ts`; die Übersicht steht nicht
  in der Liste, damit sie allein den Leistenpunkt nicht sichtbar macht.
  - „Offene Posten“ (`/offene-posten`) hat keinen eigenen Reiter. Über `alsoMatches`
    markiert die Seite den Reiter „Ausgangsrechnungen“.
  - Editor, Belegansicht und Druck liegen außerhalb des Layouts, also ohne Reiter.
- **Übersicht** (`pages/FinanceOverviewPage.tsx`), Raster wie `/uebersicht`
  (5 : 5 : 3 ab 1280 px):
  - **Ausgangsrechnungen**: Chips Überfällig / Offen / Entwürfe.
  - **Eingangsrechnungen**: Chips Neu / Überfällig / Fällig in 7 Tagen / Offen.
  - **Zahlen**: Monatsumsatz mit Vormonat, Umsatz und Ergebnis des Jahres, offene
    Forderungen und offene Eingangsrechnungen. Unter 1280 px über die volle Breite und
    nebeneinander.
  - **Letzte 12 Monate**: `MonthlyBarChart`, umschaltbar Umsatz/Ausgaben, eine Reihe zur
    Zeit wie in den Auswertungen.
- Die **Chips filtern in der Karte** (`overview/DeskCard.tsx`), ohne Seitenwechsel.
  Vorausgewählt ist die erste Gruppe mit Inhalt in der Reihenfolge der Karte, bis jemand
  klickt. Gruppen sind Teilmengen: „Überfällig“ steckt auch in „Offen“.

## Regeln

- **Rechte je Karte**, wie auf der Startseite. Ohne Recht fehlt die Karte, keine Nullen.
  Ausgangsrechnungen brauchen `canReadSalesDocuments`, Eingangsrechnungen
  `canViewExpenses`, Zahlen und Diagramm `canViewCompanyFinance` (`useFinanceAccess`).
- **Netto** für Umsatz, Ergebnis und Diagramm (`monthlyNetRevenue`, `computeYearResult`).
  Brutto nur bei offenen Forderungen und offenen Eingangsrechnungen, weil das Geld ist,
  das tatsächlich fließt.
  - ⚠️ `monthlyRevenue` rechnet brutto. Die Mini-Balken der Startseite und die
    Auswertungen nutzen es noch, Stand 2026-10-14.
- **Eingangsrechnungen**: offen ist alles außer `paid`. Teilbezahlte zählen mit vollem
  Brutto, weil Bautakt Zahlungen auf Eingangsrechnungen noch nicht erfasst. „Neu“ heißt
  wie auf der Startseite: seit Beginn des letzten Arbeitstags (`newSince`).
- Das Diagramm „Ausgaben“ zeigt Ausgaben und Eingangsrechnungen, **ohne Lohn**. Das
  Ergebnis rechnet Lohn mit (`canViewWageCosts`). Ein negatives Ergebnis bei leerem
  Ausgaben-Diagramm ist deshalb möglich.

## Fallstricke

- Fluent-`TabList` überstimmt ein Tailwind-`flex-wrap`. Die Chips setzen es inline, sonst
  wird in schmalen Karten der letzte Chip abgeschnitten.
- Ein Fluent-`Text` mit `block py-6` in einer `COLUMN_SCROLL`-Fläche erzeugte einen
  Mini-Scrollbalken. Leere Zustände sind deshalb ein schlichtes `<p>`.
