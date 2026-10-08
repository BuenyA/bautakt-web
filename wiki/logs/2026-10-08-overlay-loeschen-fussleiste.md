# 2026-10-08 — Overlay im Dunkelmodus und Löschen in der Fußleiste

Der Schleier hinter Dialogen war im Dunkelmodus hellgrau, weil er
`bg-foreground/40` nutzte und `--foreground` dort `#fafafa` ist. Löschen
saß bei Notiz, Zeit, Material und Bautagebuch noch im Formular, bei der
Checkliste schon links in der Fußleiste.

## Was geändert wurde

- `--overlay` in `packages/ui`: Light weiter Vordergrundfarbe bei 40 %,
  Dark Schwarz bei 65 %. `Dialog`, `AlertDialog` und `Sheet` lesen
  `bg-overlay`. `z-[60]` und `duration-150` bleiben.
- „Notiz löschen“, „Zeiteintrag löschen“, „Material löschen“ und
  „Bericht löschen“ sitzen links in der Fußleiste, Abbrechen und Speichern
  rechts. Die Checkliste war schon so und bricht mit um.
- Abgerechnete Zeit- und Materialzeilen zeigen weiter den Hinweis und
  keinen Löschen-Knopf. Das Bautagebuch blendet den Knopf ohne Recht aus;
  die Sperre im Dialog bleibt.

Geprüft und nicht verschoben, weil es kein Formular-Sheet ist: Foto löschen
im Lightbox-Dialog, Einsatz löschen auf der Detailseite, Kostenstelle
löschen in der Liste. Kunden haben im Web keinen Löschen-Dialog.

## Warum

Ein heller Schleier auf der dunklen Fläche wäscht den Hintergrund aus.
Dieselbe Fußleiste macht die destruktive Aktion an derselben Stelle
findbar, ohne Rechte, Sperren oder das Warten auf den Server zu ändern.

Issue: [#122](https://github.com/BuenyA/bautakt-web/issues/122).

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [fallstricke.md](../pages/fallstricke.md)
- [auftragsnotizen.md](../pages/auftragsnotizen.md)
- [auftragszeiten.md](../pages/auftragszeiten.md)
- [auftragsmaterial.md](../pages/auftragsmaterial.md)
- [auftragscheckliste.md](../pages/auftragscheckliste.md)
- [bautagebuch.md](../pages/bautagebuch.md)
