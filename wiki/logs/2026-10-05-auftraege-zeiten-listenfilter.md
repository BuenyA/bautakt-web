# 2026-10-05 — Aufträge und Zeiten filtern wie in der App

Scheibe 1 und 2 haben die Chips an Mitarbeiter, Kunden und Rechnungen
gehängt. Die Auftragsliste zeigte noch „Alle“ und „Angebote“ ohne die
Gruppen der App, und abgelehnte Angebote fehlten im Angebote-Tab. Die
Zeitenliste zeigte jeden Eintrag; die App öffnet auf der Woche.

## Was geändert wurde

- `/auftraege` schaltet mit dem grauen `Tabs`-Pill zwischen Aufträge und
  Angebote. Default ohne Param ist Aufträge. `?status=quote` bleibt.
- Unter Aufträge stehen „Laufende Aufträge“ und „Abgeschlossen“, unter
  Angebote „Angebote“ und „Abgelehnt“. Kein Chip „nur aktiv“. Die
  Überschrift fällt weg, sobald sortiert wird.
- `useOrders` lädt alle Status. Die Art filtert clientseitig, sonst
  käme „Abgelehnt“ nie neben den offenen Angeboten an.
- `/zeiten` filtert die schon geladenen Zeilen mit Heute · Woche ·
  Monat. Default ohne `period` ist die Woche. `?order=` bleibt stehen.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Kunden und Rechnungen filtern nach Art](./2026-10-01-kunden-rechnungen-listenfilter.md)
