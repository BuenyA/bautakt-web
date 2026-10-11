# 2026-10-11 — Kalender: Termine wie in der App

## Was geändert wurde

Der Kalender zeigt Termine aus `calendar_events`, Einsätze und eigene
Abwesenheiten in Jahr, Monat, Woche und Tag. Termine lassen sich anlegen,
ändern und löschen, mit allen Feldern der Handy-App, inklusive Serien
(„Nur dieser“ / „Alle Termine“). Details: [kalender.md](../pages/kalender.md).

## Warum

Owner-Vorgabe: Termine ließen sich bisher nur in der Handy-App anlegen.

## Was man wissen muss

- Serien rechnen in UTC wie `rrule` in der App, damit Ausnahmen passen. Dadurch
  verschiebt sich ein Serientermin nach der Zeitumstellung um eine Stunde — in
  App und Web gleich. Korrektur nur in beiden zusammen.
- In der App gefunden, nicht behoben: Beim Bearbeiten geht eine geänderte
  Erinnerung verloren (`updateCalendarEvent` kopiert `reminderMinutes` nicht),
  und „Alle Termine“ aus einem Vorkommen setzt den Serienbeginn auf dieses
  Vorkommen.
