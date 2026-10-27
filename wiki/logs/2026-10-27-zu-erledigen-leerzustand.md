# 2026-10-27 — Leerzustand in „Zu erledigen“ mittig

## Was geändert wurde

In „Zu erledigen“ steht der leere Zustand in der Mitte der Karte: Fluents
`CheckmarkCircle48Regular` (48 px, `colorStatusSuccessForeground1`), darunter
„Alles erledigt für heute“ und klein „Keine offenen Aufgaben“. Der Kartenkörper
füllt die Zeilenhöhe, der Block ist darin zentriert.

Der Baustein heißt `DashboardEmptyState`. Der Einsatzplan nutzt ihn mit dem
bisherigen Kreis, dem gedämpften Satz und „Einsatz planen“.

## Warum

Die Karte ist auf breiten Bildschirmen so hoch wie der Einsatzplan daneben.
„Nichts offen — alles erledigt.“ klebte unter dem Kopf, darunter blieb die
Fläche leer. Eine zweite, eigene Optik hätte die beiden Karten
auseinanderlaufen lassen.

## Geprüft

Gemessen im Browser bei 1280×900, hell und dunkel, an den echten Karten
(`TodoPanel`, `CrewPlanSection`):

- „Zu erledigen“: der Block (Häkchen bis Caption) hat je 153 px Abstand nach
  oben und unten und je 132 px nach links und rechts. Das Häkchen ist 48×48.
  Farbe hell `rgb(14, 112, 14)`, dunkel `rgb(84, 176, 84)` — das ist
  `colorStatusSuccessForeground1`. Die Caption ist `colorNeutralForeground3`
  (hell `rgb(97, 97, 97)`, dunkel `rgb(173, 173, 173)`).
- Einsatzplan: je 138 px über dem Inhalt und unter dem Knopf, wie am
  2026-10-26. Die Kartenbilder vor und nach der Umstellung sind pixelgleich
  (hell und dunkel, 0 abweichende Pixel).
- Steht ein Eintrag in „Zu erledigen“, bleibt er unter dem Kopf.
