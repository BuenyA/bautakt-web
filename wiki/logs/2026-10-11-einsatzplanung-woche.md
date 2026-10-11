# 2026-10-11 — Einsatzplanung als Wochenplan, neue Einsatzseite

## Was geändert wurde

- `/einsatzplanung` ist ein Wochenplan mit Gesichtern statt einer Tabelle.
  Die Tabelle mit Filter „Alle / Diese Woche“ ist weg.
- Die Einsatzseite zeigt Datum und Uhrzeit oben, den Auftrag groß, die
  Mitarbeiter als Kacheln mit Bild, Notizen und „angelegt von“.
- Einsätze lassen sich bearbeiten. Nur neu Eingeteilte werden benachrichtigt.
- Das Zeitraster der Kalenderwoche ist in gemeinsame Bausteine zerlegt.
- `CrewMember` und `crewMember` liegen jetzt in `features/assignments/crew.ts`.

Details: [einsatzplanung.md](../pages/einsatzplanung.md).

## Warum

Owner-Rückmeldung: Die Tabelle und die alte Detailseite waren nicht
brauchbar, und Bearbeiten ging gar nicht.
