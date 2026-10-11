# Übersicht (Startseite der Web-App)

Route `/uebersicht` (`HOME_ROUTE`), Code in `apps/webapp/src/features/overview/`.
Ziel: der ganze Betrieb auf einen Blick.

1. **Kopf** (`OverviewGreeting`): Gruß mit Vorname (`profiles.first_name`), Datum,
   Fluent-`InteractionTag`-Chips mit Zählern (offene Anträge, abwesend, neue
   Eingangsrechnungen, Fristen heute/vorbei, überfällige Rechnungen). Ein Chip
   erscheint nur mit Zähler > 0 und springt zum Abschnitt.
2. **Eine Reihe aus drei Spalten** (ab 1280 px; 1024–1279 px: Einsatzplan und Heute
   nebeneinander, Zu erledigen darunter; schmaler: untereinander). Jede Spalte ist eine
   Fluent-`Card`, gleich hoch, Inhalt scrollt ab 640 px selbst (`COLUMN_SCROLL`).
   - **Einsatzplan heute** (links, `CrewPlanSection`, breiteste Spalte): eine Kachel je
     Einsatz wie `WorkAssignmentCard` der App — Auftrag, Baustelle, Uhrzeit als Pill,
     Team mit Avatar-Stapel (`CrewAvatars`, Fluent `AvatarGroup`), Notiz, Knöpfe
     „Auftrag“, „Maps“ (Google-Maps-Suche, neuer Tab, `mapsSearchUrl`) und „Zum
     Einsatz“. Laufende Einsätze mit Brand-Rahmen und „läuft“, vergangene gedämpft.
   - **Heute** (Mitte, `TodayPlanCard`): Abwesende mit Profilbild, ganztägige Termine,
     darunter die flache Zeitleiste (`DayTimeline`, 32 px je Stunde, 7–18 Uhr, wächst bei
     Bedarf, rote Jetzt-Linie). Überlappendes steht nebeneinander; in schmalen Spalten
     nur der Name, Zeit im Tooltip. Unter 768 px eine Liste.
   - **Zu erledigen** (rechts, `TodoPanel`): Anträge (mit „Genehmigen“ über
     `approve_absence`), neu eingegangene Eingangsrechnungen, Fristen (7 Tage +
     Überfälliges), überfällige Rechnungen, mahnfähige Belege und Entwürfe.
3. **Zahlen des Jahres** (`YearKpiRow`): Umsatz, Aufwände, Ergebnis, offene
   Forderungen — netto, 01.01. bis heute.

**Warum diese Reihenfolge:** gelesen wird links → rechts, und die erste Frage am Morgen
ist „wer ist wo“ — die Kacheln brauchen die meiste Breite. Die Zeitleiste in der Mitte
verbindet beide Seiten. Aufgaben stehen rechts als Aktionsleiste, wie man es aus
Outlook/Teams kennt.

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

- Angebote haben im Schema keine Gültigkeit (`valid_until` fehlt) — darum keine
  Angebotsfristen.
- Reine Tagesrechnungen liegen in `today.ts` ohne `@/`-Importe, damit
  `node --test` sie prüfen kann (`today.test.ts`).
