# 2026-10-11 — Kalender: Woche als Standard, Einsätze ausblendbar

## Was geändert wurde

- `/kalender` öffnet in der Woche statt im Monat. Der Monat steht jetzt als
  `?ansicht=monat` in der URL, die Woche braucht keinen Parameter.
- In Woche und Tag kleben Titel und Uhrzeit oben, wie in der Einsatzplanung.
- Schalter „Einsätze anzeigen“ neben der Legende. Aus: keine Einsätze, kein
  Legendenpunkt. Gespeichert je Nutzer im localStorage.

## Warum

Wunsch des Owners: manche planen Einsätze nur in der Einsatzplanung und wollen
im Kalender nur Termine sehen, andere wollen beides.

## Fallstrick

`sticky` in einem `<button>` greift nur, wenn der Button `display: flex` hat.
Sonst legt der Browser den Inhalt zentriert in eine innere Box, die genau so
hoch ist wie der Inhalt — da gibt es nichts zu kleben.
