# 2026-10-01 — Mitarbeiterliste filtert auf Aktiv

Die Web-Liste `/mitarbeiter` zeigte jede Beschäftigung. Die Handy-App öffnet
das Verzeichnis auf **Aktiv** und bietet vier Chips: Alle, Aktiv, Ausstehend,
Inaktiv. Scheibe 1 holt nur diesen Filter nach — Look und Default, kein
Schema, kein Sheet.

## Was geändert wurde

- `ListFilterChips`: eine Zeile, `aria-pressed`, Electric-Pill wenn aktiv,
  Input-Fläche wenn nicht. Liegt in der Webapp, nicht in `@bautakt/ui`, weil
  Marketing keine Listen hat. Aufträge behalten den grauen `Tabs`-Pill
  (Pattern B); den rührt diese Änderung nicht an.
- `EmployeesListPage` filtert die schon geladenen Zeilen. Default ohne
  `?status=` ist `active`. CSV, Spalten und die DataTable-Suche bleiben.
- `DataTable` kann optional `sectionOf` setzen. Die Mitarbeiterliste nutzt
  das nur bei Filter `all` und gemischten Status, und nur solange niemand
  sortiert — sonst stehen die Gruppenüberschriften zwischen einzelnen Zeilen.
- `ended_at` mappt auf inaktiv. `pending` hat auf der Beschäftigungszeile
  kein Feld. `user_id` null bleibt aktiv: das sind manuelle Beschäftigte
  ohne Konto, nicht offene Einladungen.

## Warum Pending leer bleiben darf

Ein erfundener Pending-Status aus `user_id` würde Handwerker ohne App-Konto
aus dem Default „Aktiv“ werfen. Die Einladung ist eine eigene Tabelle und
kein Listenfeld. Der Chip „Ausstehend“ bleibt sichtbar und zeigt dann keine
Zeilen.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
