# Übersicht (Startseite der Web-App)

Route `/uebersicht` (`HOME_ROUTE`), Code in `apps/webapp/src/features/overview/`.
Ziel: der ganze Betrieb auf einen Blick. Aufbau „Heute zuerst“:

1. **Kopf** (`OverviewGreeting`): Gruß mit Vorname (`profiles.first_name`), Datum,
   Fluent-`InteractionTag`-Chips mit Zählern (offene Anträge, abwesend, neue
   Eingangsrechnungen, Fristen heute/vorbei, überfällige Rechnungen). Ein Chip
   erscheint nur mit Zähler > 0 und springt zum Abschnitt.
2. **Heute** (`TodayPlanCard`, 2/3 Breite): Abwesende mit Profilbild, ganztägige
   Termine, darunter die Zeitleiste (`DayTimeline`, 6–20 Uhr, wächst bei Bedarf,
   rote Jetzt-Linie, Überlappendes nebeneinander). Einsätze als Brand-Blöcke mit
   Auftrag, Ort, Uhrzeit und Avatar-Stapel (`CrewAvatars`, Fluent `AvatarGroup`).
   Unter 768px eine Liste statt der Zeitleiste.
3. **Zu erledigen** (`TodoPanel`, 1/3): Anträge (mit „Genehmigen“ über
   `approve_absence`), neu eingegangene Eingangsrechnungen, Fristen (7 Tage +
   Überfälliges), überfällige Rechnungen, mahnfähige Belege und Entwürfe.
4. **Zahlen des Jahres** (`YearKpiRow`): Umsatz, Aufwände, Ergebnis, offene
   Forderungen — netto, 01.01. bis heute.

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
