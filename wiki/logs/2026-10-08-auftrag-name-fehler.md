# 2026-10-08 — Leerer Auftragsname im Sheet

Speichern ohne Namen zeigt die Meldung am Namensfeld. Anlegen und
Bearbeiten nutzen denselben Text.

## Was geändert wurde

- `OrderSheet`, Modus `edit` und `create`: leerer Name (nach Trim) setzt
  keinen Fehler mehr ans Ende des Panels. Unter dem Feld steht „Bitte einen
  Namen eingeben.“ Das Feld wird in den sichtbaren Bereich gescrollt.
- Die Meldung hängt am aktuellen Text und verschwindet, sobald der Name
  nicht mehr leer ist.

## Warum

Beim Bearbeiten blieb das Panel offen, und es war keine Meldung zu sehen.
`SheetBody` scrollt, die Meldung lag unter dem Falz. Anlegen ist kürzer und
hat denselben Text, damit die beiden Modi nicht auseinanderlaufen.

Smoke von [#54](https://github.com/BuenyA/bautakt-web/issues/54), mit im
Pull Request zu [#55](https://github.com/BuenyA/bautakt-web/issues/55).

## Verweise

- [auftrag-bearbeiten.md](../pages/auftrag-bearbeiten.md)
- [fallstricke.md](../pages/fallstricke.md)
- Code: `apps/webapp/src/features/orders/OrderSheet.tsx`
