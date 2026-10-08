# 2026-10-08 — Geldfelder mit zwei Nachkommastellen

Beim Öffnen des Material-Panels standen Einkauf und Verkauf als „1,5“ und
„2,5“. Geldbeträge in Eingabefeldern kommen jetzt aus `formatMoneyInput`:
de-DE, genau zwei Nachkommastellen, ohne Tausenderpunkt und ohne
Währungszeichen. Leer bleibt leer. Die Parser sind unverändert.

## Was geändert wurde

- Material-Panel: Einkaufspreis und Verkaufspreis, beim Öffnen und bei der
  Artikelwahl. Die Menge bleibt, wie sie ist.
- Zahlungs-Panel: der vorausgefüllte Betrag. Skonto startet weiter leer.
- Belegeditor: der Einzelpreis einer bestehenden Position.

Geprüft und nicht angefasst, weil das Feld leer startet oder keins ist:
Ausgaben-Netto, Mahngebühr, Verzugszinsen, Kostenstelle (nur Kennung und
Name), Stundensätze (nur die Liste), Auftragsformular (keine Summe).

## Warum

„1,5“ liest sich nicht als Geldbetrag. Zwei Stellen machen den Cent sichtbar.
`1,50` wird wieder `1,5`; Speichern ohne weitere Änderung schreibt denselben
Wert. Ein Tausenderpunkt fehlt, weil die bestehenden Eingabefelder ihn nicht
setzen — der Parser käme mit „1.234,50“ klar, das Muster der Felder ist ohne.

Issue: [#117](https://github.com/BuenyA/bautakt-web/issues/117).

## Verweise

- [auftragsmaterial.md](../pages/auftragsmaterial.md)
- Code: `packages/finance/src/money.ts`,
  `apps/webapp/src/features/orders/orderMaterialDraft.ts`,
  `apps/webapp/src/features/finance/PaymentSheet.tsx`,
  `apps/webapp/src/features/finance/pages/DocumentEditorPage.tsx`
