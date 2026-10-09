# 2026-10-09 — Deutsche Datums- und Uhrzeitfelder

Native `input type="date"` und `type="time"` zeigten das Format der
Browsersprache. Bei englischem Browser stand im Formular `mm/dd/yyyy` bzw.
`07:00 AM`, obwohl die Oberfläche deutsch ist und die Listen schon `de-DE`
nutzen.

## Was geändert wurde

- `DatePicker`, `DateRangePicker` und `TimeInput` in `@bautakt/ui`, dazu ein
  Monatskalender (`date-fns/locale/de`, Woche beginnt am Montag).
- Anzeige `TT.MM.JJJJ` und `HH:MM`. Nach oben weiter `YYYY-MM-DD` und `HH:MM`.
- Ungültige Eingaben (`31.02.2026`, `25:00`) zeigen eine deutsche Meldung und
  gehen nicht in den Formularzustand.
- Ende vor Beginn bleibt gesperrt bei Auftrag, Abwesenheit und Einsatz.
  Nachtschicht bei Zeit und Bautagebuch bleibt.
- Popover auf `z-[70]`. Fokus im Kalender schließt Sheet und Dialog nicht.

Betroffen sind Auftrag, Belegeditor, Zahlung, Ausgabe, Zeit, Einsatz,
Abwesenheit, Bautagebuch (Datum und Von/Bis), Checkliste und Material. In
`apps/webapp/src` steht kein natives Datums- oder Uhrzeitfeld mehr.

## Warum

Die Anzeige darf nicht von der OS-Sprache abhängen. Der gespeicherte Wert
darf sich nicht ändern, sonst laufen Web und Handy-App auseinander.

Issue: [#93](https://github.com/BuenyA/bautakt-web/issues/93).

## Verweise

- [datumseingabe.md](../pages/datumseingabe.md)
- [fallstricke.md](../pages/fallstricke.md)
