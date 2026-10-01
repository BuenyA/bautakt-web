# 2026-10-01 — Sidebar-IA und Hub-Seiten

Die Seitenleiste hatte achtzehn Einträge in vier Gruppen. Aufträge und Zeiten
waren ein Klick, Rechnungen auch — die Leiste war dafür voll. Der Owner hat die
flache Top-10 freigegeben: überfüllte Bereiche werden ein Hub, die Listen
bleiben auf ihren URLs.

## Was geändert wurde

Nur Navigation und drei Landings. Kein Backend, keine neue Liste, kein
Token-Rewrite, kein Sync, kein Inhalt der Glocke.

- `navItems.ts`: flache neun Punkte plus Einstellungen im Fuß. Keine
  Überschriften Arbeit / Finanzen / Team / Stammdaten.
- `/finanzen` ist die Hub-Seite. Der Redirect auf `/rechnungen` ist weg.
- Neue Pfade nur `/personal` und `/material`. `/mitarbeiter` bleibt das
  Verzeichnis.
- Karten filtern mit denselben Rechten wie die alten Zeilen. Der Hub-Punkt
  fehlt, wenn keine Karte sichtbar ist. Null Karten auf der Seite selbst:
  bestehendes `EmptyState`.
- Rechnungen ist die Featured-Karte (Ring, zwei Spalten ab `sm`).
- „Mitarbeiter hinzufügen“ verlinkt `/mitarbeiter` ohne Query. `?neu=1` liest
  die Liste nicht.

## Warum kein `?neu=1`

Die Mitarbeiterliste öffnet das Sheet über lokalen State und den Button
„Mitarbeiter anlegen“. Eine Query dafür gibt es nicht. Sie nachzurüsten wäre
ein Create-Feature, und der Spec schließt das aus.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Demo GF 10.10.2026](../pages/demo-gf-2026-10-10.md)
