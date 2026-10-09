# 2026-10-09 — Pause nur anzeigen, wenn sie größer als 0 ist

## Was geändert wurde

Auf der Auftragskarte (`OrderTimes`) steht die Pause nur noch, wenn sie
größer als 0 ist: „Pause 30 Min.“, bei einer vollen Stunde „Pause 1 Std.“,
sonst „Pause 1 Std. 15 Min.“. Die Spalte Pause auf `/zeiten` zeigt dieselbe
Dauer ohne das Wort Pause, weil die Überschrift es schon sagt. 0 bleibt leer.

Die Nettodauer bleibt „8:00 Std.“. Speichern, Abrechnung und Abfragen sind
unberührt.

## Warum

Eine Pause von 0 ist keine Information. Die nackte Zeile „0 Min.“ stand auf
jeder Karte. Die Pause wird in Minuten und Stunden gesprochen, nicht im
Uhrstil der Nettodauer.

Bautagebuch, Mitarbeiter und die Rechnungs-Druckansicht zeigen die Pause
eines Zeiteintrags nicht. Das Formular lässt die Pause als Minutenfeld
stehen, weil dort die Zahl eingegeben wird. Der CSV-Export der Zeitenliste
nimmt den Zellenwert der Spalte, also weiter die Rohzahl.

Issue: [#133](https://github.com/BuenyA/bautakt-web/issues/133).

## Verweise

- [auftragszeiten.md](../pages/auftragszeiten.md)
