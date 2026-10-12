# 2026-10-12 — Hintergrundbild auf den Anmeldeseiten

## Was geändert wurde

- `AuthCard` (Anmelden, Registrieren, Passwort vergessen/zurücksetzen) zeigt
  `public/login-background.webp` als Hintergrund: unscharf (`blur-md`) und mit
  45 % Schwarz abgedunkelt. Das Bild ist aus `login_background.png` im
  Projektordner erzeugt (1600 px, WebP, rund 290 KB statt 3,5 MB).
- Der Schriftzug über der Karte und Impressum/Datenschutz/AGB sind hell
  (`LegalLinks onImage`).
- Der Fußtext („Sie haben bereits ein Konto? Anmelden“) steht jetzt in der
  Karte, weil ein Link in Markenblau auf dem dunklen Bild kaum lesbar wäre.

## Warum

Owner-Wunsch: die Anmeldeseite wirkte auf dem leeren Grund kahl.

## Was man wissen muss

- Ein neues Bild immer verkleinern; durch den Blur sieht man keine Details,
  mehr als 1600 px Breite kostet nur Ladezeit.
- `scale-110` auf der Bildebene ist Absicht: ohne sie zeigt der Blur am Rand
  einen hellen Saum.
