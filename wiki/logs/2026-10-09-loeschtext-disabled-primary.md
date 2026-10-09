# 2026-10-09 — Löschtext bei 0 Einträgen, gesperrtes Primary im Dunkelmodus

Der Live-Smoke von #125 hat am leeren Bericht vom 10.08. noch vor unsichtbaren
Einträgen und abgerechneten Zeiten gewarnt, obwohl die Zählung 0 war. Der
gesperrte Speichern-Knopf im Bautagebuch war im Dunkelmodus satt blau.

## Was geändert wurde

- Der Löschdialog sagt bei Zählung 0 nur noch, dass der Bericht vom genannten
  Tag gelöscht wird und das nicht rückgängig zu machen ist. Anwesenheit kommt
  als eigener Satz dazu, Singular und Plural. Sieht das Konto Material nicht
  vollständig, steht zusätzlich, dass dieses Material mitgelöscht wird. Der
  alte Satz über abgerechnete Zeiten und beliebige unsichtbare Einträge ist
  bei Zählung 0 weg.
- Fehlt die Materialsicht, sperrt das den Knopf nicht mehr, solange die
  sichtbaren Zählungen 0 sind. Sichtbare Verknüpfungen und Abgerechnetes
  sperren weiter. Der Knopf bleibt an `canTrackTimeForTeam` und dem
  Bearbeitungsrecht.
- Gesperrte Knöpfe im Dunkelmodus liegen bei 30 % Deckkraft, im Hellen weiter
  bei 50 %. Das gilt für jede Variante des gemeinsamen `Button`.

## Warum

Die Zählung ist ein Client-Select unter der RLS des Kontos. Für den
Löschen-Knopf sind Zeiten, Fotos, Mängel und Anwesenheit vollständig
sichtbar. Nur Material kann fremde Zeilen verbergen. Eine 0 dort ist kein
Beweis, der Text darf das aber nicht als abgerechnete Zeiten verkaufen.
50 % Electric auf Anthrazit liest sich als aktiver blauer Knopf.

Issue: [#126](https://github.com/BuenyA/bautakt-web/issues/126).

## Verweise

- [bautagebuch.md](../pages/bautagebuch.md)
- [fallstricke.md](../pages/fallstricke.md)
- [webapp-shell.md](../pages/webapp-shell.md)
