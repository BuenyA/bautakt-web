# 2026-10-05 — Druckansicht bei unbekannter Beleg-Id

`/rechnungen/:id/druck` hing auf dem Spinner, sobald der Beleg fehlte. Die
Seite behandelte `!data` als Ladezustand. Eine unbekannte Id liefert `null`,
eine Nicht-UUID einen Fehler, eine fehlende Id lässt die Abfrage disabled
und damit dauerhaft `isPending`. Gültige Belege und der Briefkopf waren
davon nicht betroffen.

## Was geändert wurde

- Die Druckseite zeigt den Spinner nur noch, solange eine Id vorliegt und
  die Belegabfrage pending ist.
- Danach gilt derselbe Nicht-gefunden- bzw. Ladefehler wie auf der
  Detailseite, mit Rückweg nach `/rechnungen`. Wiederholen bleibt beim
  Ladefehler.
- Der Briefkopf lädt weiter unabhängig und hält die Druckseite nicht fest.

## Verweise

- [fallstricke.md](../pages/fallstricke.md)
- [webapp-shell.md](../pages/webapp-shell.md)
- Issue #35
