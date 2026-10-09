# 2026-10-09 — Pause nur anzeigen, wenn sie größer als 0 ist

## Was geändert wurde

Auf der Auftragskarte (`OrderTimes`) und in der Spalte Pause auf `/zeiten`
steht die Pause nur noch, wenn sie größer als 0 ist. Der Text ist
„Pause 0:30 Std.“ bzw. „Pause 1:15 Std.“, derselbe Stil wie die Nettodauer
(`8:00 Std.`). Vorher stand auf jeder Karte „0 Min.“, auch ohne Pause.

Die Nettodauer rechnet unverändert. Speichern, Abrechnung und Abfragen sind
unberührt.

## Warum

Eine Pause von 0 ist keine Information. Die nackte Minutenzahl „30 Min.“
weicht vom Dauer-Stil der Nettodauer ab; ab 60 Minuten wäre „90 Min.“
schlechter lesbar als „1:30 Std.“.

Bautagebuch, Mitarbeiter und die Rechnungs-Druckansicht zeigen die Pause
eines Zeiteintrags nicht. Das Formular lässt die Pause als Minutenfeld
stehen, weil dort die Zahl eingegeben wird. Der CSV-Export der Zeitenliste
nimmt den Zellenwert der Spalte, also weiter die Rohzahl.

Issue: [#133](https://github.com/BuenyA/bautakt-web/issues/133).

## Verweise

- [auftragszeiten.md](../pages/auftragszeiten.md)
