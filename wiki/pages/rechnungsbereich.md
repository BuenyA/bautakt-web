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
leitet auf die Übersicht um (`routes.legacyFinance`), `/ausgaben` mit Query auf
`/rechnungen/eingang` (`LegacyExpensesRedirect`). Alte Lesezeichen auf die Liste
(`/rechnungen?status=…`) landen jetzt auf der Übersicht, ihr Filter geht verloren.

## Aufbau

- **Reiter statt Hub-Kacheln** (`FinanceLayout.tsx`): Übersicht · Ausgangsrechnungen
  (`/rechnungen/ausgang`) · Eingangsrechnungen (`/rechnungen/eingang`) · Angebote · Mahnwesen · Auswertungen.
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
  - Kein Diagramm: Die 12-Monats-Karte ist am 2026-10-14 auf Owner-Wunsch wieder
    rausgeflogen. Die Seite soll ohne Scrollen auskommen, Verläufe stehen nur unter
    „Auswertungen“.
- Die **Chips filtern in der Karte** (`overview/DeskCard.tsx`), ohne Seitenwechsel.
  Vorausgewählt ist die erste Gruppe mit Inhalt in der Reihenfolge der Karte, bis jemand
  klickt. Gruppen sind Teilmengen: „Überfällig“ steckt auch in „Offen“.
- **Eingangsrechnungen-Liste** (`pages/ExpensesPage.tsx`): Stand 2026-10-30 ohne
  Filter-Reiter und ohne zweite Überschrift „Eingangsrechnungen“ über der Tabelle, so
  schlicht wie die Ausgangsrechnungen. Der Status (Alle / Offen / Überfällig / Entwurf /
  Bezahlt, mit Anzahl) liegt im Knopf „Filter“ neben CSV und Spalten
  (`ListFilterMenu` im `DataTable`-Slot `actions`). `?status=` bleibt. Die Überschrift
  erscheint nur, wenn rechts daneben „Sonstige Ausgaben“ stehen.

## DATEV-Export (`/rechnungen/datev-export`)

`pages/DatevExportPage.tsx`, Logik in `datevExport.ts`. Den Buchungsstapel baut die
Edge Function `datev-export` (bautakt-app, Wiki `finanzmodul.md`).

- **Belegart und Monat wählen.** Ausgangs- und Eingangsrechnungen sind getrennte
  Stapel (`direction`). Die Auswahl „Belege“ erscheint nur mit
  `canViewCompanyFinance` oder `canManageOverheadCosts`, den Rechten von
  `datev_incoming_export`. Ohne sie bleibt es beim Ausgang.
- **Prüfung beim Wechsel** (`check_only`). Fehler und Warnungen stehen vor dem
  Download. Der Eingang hat eigene Texte, wo das Konto anders heißt
  (`findingsIncoming`, sonst `findings`). Steuerart und Satz im Befund werden
  lesbar („§ 13b, 19 %“).
- **„Zu den DATEV-Einstellungen“** (`datevExport.toSettings`) führt auf
  `routes.companyDatev` (`/unternehmen/datev`). Das ist der Abschnitt im
  Unternehmensbereich: eigene Adresse, in der Unternavigation ausgewählt, auch
  beim direkten Aufruf. `/einstellungen` ist seit 2026-10-30 nur noch
  Darstellung und Benachrichtigungen. Andere Stellen nennen die
  DATEV-Einstellungen im Satz (Freigabe-Dialog) oder verlinken etwas anderes
  (Schnellsuche, Versand, Ablehnungsmail) und führen nicht dorthin.
- **Ein Klick: CSV + ZIP.** Ausgang: Archiv-PDFs; ohne Archiv-PDF gibt es nichts.
  Eingang: die Originale mit ihrer Endung (PDF, XML, Bild), benannt nach
  Belegfeld 1. Eine Eingangsrechnung ohne Original (Papierbeleg) blockiert nicht:
  Sie fehlt im ZIP und wird danach genannt. Hat keine ein Original, gibt es nur die CSV.

## Regeln

- **Rechte je Karte**, wie auf der Startseite. Ohne Recht fehlt die Karte, keine Nullen.
  Ausgangsrechnungen brauchen `canReadSalesDocuments`, Eingangsrechnungen
  `canViewExpenses`, Zahlen `canViewCompanyFinance` (`useFinanceAccess`).
- **Netto** für Umsatz, Ergebnis und Diagramme, im ganzen Bereich, auf der Startseite und
  in den Auswertungen (`monthlyRevenue`, `computeYearResult`, `expenseEntries`).
  Brutto nur bei offenen Forderungen und offenen Eingangsrechnungen, weil das Geld ist,
  das tatsächlich fließt.
  - Bis 2026-10-14 rechneten `monthlyRevenue`, die Mini-Balken der Startseite und die
    Auswertungen (Umsatz, Ausgaben, Umsatz je Kunde) brutto, die Zahlen daneben netto.
- **Eingangsrechnungen**: offen ist alles außer `paid`. Teilbezahlte zählen mit vollem
  Brutto, weil Bautakt Zahlungen auf Eingangsrechnungen noch nicht erfasst. „Neu“ heißt
  wie auf der Startseite: seit Beginn des letzten Arbeitstags (`newSince`).
- Das Ausgaben-Diagramm der Auswertungen zeigt Ausgaben und Eingangsrechnungen, **ohne
  Lohn**. Das Ergebnis rechnet Lohn mit (`canViewWageCosts`). Ein negatives Ergebnis bei
  leerem Ausgaben-Diagramm ist deshalb möglich.

## Fallstricke

- Fluent-`TabList` überstimmt ein Tailwind-`flex-wrap`. Die Chips setzen es inline, sonst
  wird in schmalen Karten der letzte Chip abgeschnitten.
- Ein Fluent-`Text` mit `block py-6` in einer `COLUMN_SCROLL`-Fläche erzeugte einen
  Mini-Scrollbalken. Leere Zustände sind deshalb ein schlichtes `<p>`.
