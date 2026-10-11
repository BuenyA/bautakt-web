# Übersicht (Startseite der Web-App)

Route `/uebersicht` (`HOME_ROUTE`), Code in `apps/webapp/src/features/overview/`.
Ziel: der ganze Betrieb auf einen Blick.

1. **Kopf** (`OverviewGreeting`): Gruß mit Vorname ohne Komma („Guten Tag Bünyamin“,
   `profiles.first_name`) und Datum. Keine Zähler-Chips — sie wiederholten nur die Spalten.
2. **Eine Reihe aus drei Spalten** (ab 1280 px im Verhältnis 5 : 5 : 3; 1024–1279 px:
   Einsatzplan und Zu erledigen nebeneinander, Heute darunter; schmaler: untereinander).
   Jede Spalte ist eine Fluent-`Card`, gleich hoch, Inhalt scrollt ab 640 px selbst
   (`COLUMN_SCROLL`).
   - **Einsatzplan heute** (links, `CrewPlanSection`): eine Kachel je Einsatz wie
     `WorkAssignmentCard` der App — Auftrag, Baustelle, Uhrzeit als Pill, Team mit
     Avatar-Stapel (`CrewAvatars`, Fluent `AvatarGroup`), Notiz, Knöpfe „Auftrag“,
     „Maps“ (Google-Maps-Suche, neuer Tab, `mapsSearchUrl`) und „Zum Einsatz“.
     Keine farbige Hervorhebung laufender Einsätze (Farbe zog den Blick zu stark);
     vergangene sind gedämpft. „Zum Einsatz“ steht rechtsbündig.
   - **Zu erledigen** (Mitte, `TodoPanel`, so breit wie der Einsatzplan): Anträge (mit
     „Genehmigen“ über `approve_absence`), neu eingegangene Eingangsrechnungen, Fristen
     (7 Tage + Überfälliges), überfällige Rechnungen, mahnfähige Belege und Entwürfe.
   - **Heute** (rechts, `TodayPlanCard`, schmalste Spalte): Abwesende mit Profilbild,
     ganztägige Termine, darunter die Zeitleiste (`DayTimeline`, 32 px je Stunde) für den
     ganzen Tag 0–24 Uhr in einem Fenster von zwölf Stunden, in dem die Uhrzeit scrollt.
     Beim Öffnen steht es auf 7 Uhr oder auf dem ersten früheren Eintrag; rote Jetzt-Linie.
     Überlappendes steht nebeneinander, dann nur der Name, Zeit im Tooltip. Ein leerer
     Tag zeigt die leere Zeitleiste, keinen Hinweis — das Planen gehört in den
     Einsatzplan. Am Handy eine Liste, solange es Einträge gibt.
3. **Zahlen des Jahres** (`YearKpiRow`): Umsatz, Aufwände, Ergebnis, offene
   Forderungen — netto, 01.01. bis heute.

**Warum diese Reihenfolge** (vom Owner festgelegt): links „wer ist wo“, in der Mitte
gleich breit „was ist zu tun“, rechts schmal der Kalender — er zeigt ohnehin nur den
heutigen Tag.

## Regeln

- **Ergebnis = Umsatz netto − (Ausgaben netto + Eingangsrechnungen netto +
  Lohnkosten).** Gerechnet in `@bautakt/finance` (`computeYearResult`,
  `laborCostMinor`). Kalkulatorische Kosten zählen nicht.
- **Lohnkosten** = Netto-Stunden × Kostensatz: gestempelter `time_entries.cost_rate`,
  sonst `labor_rates` (Auftrag → Mitarbeiter → Firma), zuletzt 38 €/h wie in der App.
  Nur mit `canViewWageCosts`; sonst steht „Ohne Lohnkosten“ unter den Aufwänden.
  Zeiteinträge werden in 1000er-Seiten geladen (PostgREST-Grenze).
- **Rechte je Abschnitt** (Führung, keine Kontrolle — Grenze bleibt RLS):
  Zahlenzeile `canViewCompanyFinance` (ohne Recht fehlt sie ganz, keine Nullen),
  Anträge `canManageAbsences`, Eingangsrechnungen `canViewExpenses`.
- **„Neu“ bei Eingangsrechnungen** = `created_at` seit Beginn des letzten
  Arbeitstags; montags also seit Freitag 00:00.
- **Abwesend heute** = genehmigt, oder Krankmeldung (`krankheit`, `kind_krank`)
  noch ausstehend (Badge „unbestätigt“).
- **Termine** kommen direkt aus `calendar_events` (Firmentermine + eigene, wie
  die RLS). Serientermine legt `recurrenceCoversDate` auf heute — Spiegel von
  `recurrence_covers_date()` der App; geänderte/abgesagte Einzelinstanzen ersetzen
  die Serie.
- **Profilbilder**: `profiles.profile_image_url` ist meist ein Pfad im privaten
  Bucket `profile-images`; `useProfileImageUrls` signiert sie gebündelt (1 h).

## Warum nicht `my_morning_briefing`

Die RPC der App liefert nur die Blöcke, die jemand in den
Benachrichtigungseinstellungen eingeschaltet hat, Termine ohne Ende und
Abwesenheiten ohne Mitarbeiter-ID (keine Bilder). Für eine Startseite, die immer
alles zeigen soll, passt das nicht.

## Fallstricke

- Scrollende Spalten setzen `overflow-x-hidden` ausdrücklich: Mit nur `overflow-y: auto`
  scrollt CSS auch seitlich, sobald etwas einen Pixel übersteht (so geschehen durch
  `-mx-2` an den Zeilen in „Zu erledigen“).

- Angebote haben im Schema keine Gültigkeit (`valid_until` fehlt) — darum keine
  Angebotsfristen.
- Reine Tagesrechnungen liegen in `today.ts` ohne `@/`-Importe, damit
  `node --test` sie prüfen kann (`today.test.ts`).
