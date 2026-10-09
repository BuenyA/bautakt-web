# 2026-10-09 — Löschtext bei 0 Einträgen, gesperrtes Primary im Dunkelmodus

Der Live-Smoke von #125 hat am leeren Bericht vom 10.08. noch vor unsichtbaren
Einträgen und abgerechneten Zeiten gewarnt, obwohl die Zählung 0 war. Der
gesperrte Speichern-Knopf im Bautagebuch war im Dunkelmodus satt blau.

## Was geändert wurde

- Sieht das Konto jedes Material und sind die Zählungen 0, sagt der Dialog
  nur noch, dass der Bericht vom genannten Tag gelöscht wird und das nicht
  rückgängig zu machen ist. Anwesenheit kommt als eigener Satz dazu, Singular
  und Plural. Der alte Satz über abgerechnete Zeiten und beliebige unsichtbare
  Einträge ist dabei weg.
- Fehlt die Materialsicht, bleibt der Knopf aus, auch bei Zählung 0. Fremdes
  Material kann abgerechnet sein, die Kaskade würde es löschen. Der Text sagt
  nur, dass Material anderer Personen nicht sichtbar ist. Eine Zwischenfassung
  hat den Knopf in diesem Fall freigegeben; das ist am selben Tag zurückgenommen.
- Gesperrte Knöpfe im Dunkelmodus liegen bei 30 % Deckkraft, im Hellen weiter
  bei 50 %. Das gilt für jede Variante des gemeinsamen `Button`.

## Warum

Die Zählung ist ein Client-Select unter der RLS des Kontos. Für den
Löschen-Knopf sind Zeiten, Fotos, Mängel und Anwesenheit vollständig
sichtbar. Nur Material kann fremde Zeilen verbergen. Eine 0 dort ist kein
Beweis, und weil solches Material abgerechnet sein kann, bleibt der Knopf aus.
Der Text darf das nicht als verknüpfte Einträge oder abgerechnete Zeiten
verkaufen.
50 % Electric auf Anthrazit liest sich als aktiver blauer Knopf.

Issue: [#126](https://github.com/BuenyA/bautakt-web/issues/126).

## Verweise

- [bautagebuch.md](../pages/bautagebuch.md)
- [fallstricke.md](../pages/fallstricke.md)
- [webapp-shell.md](../pages/webapp-shell.md)
