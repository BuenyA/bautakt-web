# 2026-10-26 — Leerzustand im Einsatzplan mittig

## Was geändert wurde

In „Einsatzplan heute“ steht der leere Zustand (Icon, „Heute sind keine
Einsätze geplant.“, „Einsatz planen“) in der Mitte der Karte. Der Kartenkörper
füllt die Zeilenhöhe, der Hinweis ist darin zentriert. Farben bleiben
Fluent-Tokens.

## Warum

Die Karte ist auf breiten Bildschirmen so hoch wie die Zeitleiste daneben.
Der Hinweis klebte unter dem Kopf, darunter blieb die Fläche leer.

„Zu erledigen“ ist nicht mitgezogen: dort ist der Leerzustand nur ein Satz,
kein gemeinsamer Baustein. Er bleibt oben.

## Geprüft

Gemessen im Browser an den echten Karten (`CrewPlanSection`, `TodoPanel`,
`TodayPlanCard`): bei 1280 und 1440 px je 138 px Abstand über dem Icon und
unter dem Knopf, Mitte bei 0. Bei 390 und 1100 px ist die Karte nur so hoch
wie der Inhalt, der Block horizontal mittig, der Knopf übersteht nicht.
Mit einem Einsatz bleibt die Kachel oben. Hell und dunkel.

Nachgezogen am 2026-10-27: [Leerzustand in „Zu erledigen“](2026-10-27-zu-erledigen-leerzustand.md).
