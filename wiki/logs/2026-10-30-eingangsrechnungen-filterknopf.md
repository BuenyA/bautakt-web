# 2026-10-30 — Eingangsrechnungen: Filter-Knopf statt Reiter

Über der Liste der Eingangsrechnungen standen noch einmal die Überschrift
„Eingangsrechnungen“ und die Reiter Alle · Offen · Überfällig · Entwurf ·
Bezahlt. Der Owner wollte die Seite so schlicht wie die Ausgangsrechnungen und
den Filter als Knopf neben CSV und Spalten.

## Was geändert wurde

- `DataTable` hat den Slot `actions` (Knöpfe rechts vor CSV und Spalten).
- `ListFilterMenu` (`components/common`): Knopf „Filter“ mit Radio-Menü und
  Anzahl je Eintrag. Ist ein Filter aktiv, nennt der Knopf ihn und ist Primary.
- `ExpensesPage`: Reiter weg, Überschrift nur neben „Sonstige Ausgaben“.
  `?status=` und die Zählung sind unverändert.

## Offen

Ausgangsrechnungen und Angebote sollen denselben Knopf bekommen. Die Seiten
gehören zu Strang A und kommen in einem eigenen Schritt.

## Verweise

- [rechnungsbereich.md](../pages/rechnungsbereich.md#aufbau)
- [fluent-ui.md](../pages/fluent-ui.md)
