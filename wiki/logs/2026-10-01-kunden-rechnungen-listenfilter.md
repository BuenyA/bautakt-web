# 2026-10-01 — Kunden und Rechnungen filtern nach Art

Scheibe 1 hat die Chips nur an die Mitarbeiterliste gehängt. Die Handy-App
filtert Kunden nach Alle / Firmen / Privat (Default Alle) und Belege nach
Rechnungen / Auftragsbestätigungen / Lieferscheine / Alle (Default
Rechnungen). Die Web-Rechnungsliste zeigte stattdessen Status-Tabs. Die
gibt es auf der Hauptliste der App nicht.

## Was geändert wurde

- `/kunden` filtert die schon geladenen Zeilen. `?filter=company` ist
  `customer_type` `b2b`, `private` ist `b2c`. Ohne Param gilt `all`.
- `/rechnungen` lädt zusätzlich Auftragsbestätigungen und Lieferscheine
  und filtert clientseitig. Der Chip `invoice` umfasst auch Abschlag und
  Schluss. `delivery` trifft `delivery_note`. Ohne `filter` gilt
  `invoice`.
- Die Status-Tabs sind entfernt. `?status=` bleibt ein Deep-Link ohne
  Chip, und ein Typ-Wechsel löscht ihn nicht.
- Angebote, Gutschriften und Stornos bleiben aussen vor: die ersten haben
  eine eigene Seite, die anderen keinen Chip in der App.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Mitarbeiterliste filtert auf Aktiv](./2026-10-01-mitarbeiter-listenfilter.md)
