# 2026-10-11 — Kalender: Termine wie in der App

## Was geändert wurde

Der Kalender zeigt Termine aus `calendar_events`, Einsätze und eigene
Abwesenheiten in Jahr, Monat, Woche und Tag. Termine lassen sich anlegen,
ändern und löschen, mit allen Feldern der Handy-App, inklusive Serien
(„Nur dieser“ / „Alle Termine“). Details: [kalender.md](../pages/kalender.md).

## Warum

Owner-Vorgabe: Termine ließen sich bisher nur in der Handy-App anlegen.

## Was man wissen muss

- Nachtrag am selben Tag: Serien rechnen jetzt in Ortszeit (App und Web),
  Ausnahmen passen über den lokalen Tag. Vorher rutschte ein Serientermin nach
  der Zeitumstellung um eine Stunde.
- In der App behoben: Eine beim Bearbeiten geänderte Erinnerung ging verloren,
  und „Alle Termine“ aus einem Vorkommen setzte den Serienbeginn auf dieses
  Vorkommen. Das Web hatte beide Fehler nie.
