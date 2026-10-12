# 2026-10-12 — Hintergrundbild auf den Anmeldeseiten

## Was geändert wurde

- `AuthCard` (Anmelden, Registrieren, Passwort vergessen/zurücksetzen) zeigt
  `public/login-background.webp` als Hintergrund: unscharf (`blur-md`) und mit
  45 % Schwarz abgedunkelt. Das Bild ist aus `login_background.png` im
  Projektordner erzeugt (dunkelblaue Wellen, 1600 px, WebP, rund 18 KB).
- Die Anmeldeseiten sind **immer dunkel**, egal was unter „Darstellung“
  gewählt ist: `AuthCard` hat einen eigenen `FluentProvider` mit
  `darkTheme`. Die Tailwind-Farben zeigen auf die Fluent-Variablen und werden
  dadurch mit dunkel.
- Helm und Schriftzug stehen zentriert oben **in** der Karte, darunter
  linksbündig Titel und Untertitel. Auch der Fußtext („Sie haben bereits ein
  Konto? Anmelden“) steht in der Karte.
- Kräftiger Schatten um die Karte (Fluents eigener ist ungelayert, daher
  `shadow-[…]!`).

## Warum

Owner-Wunsch: die Anmeldeseite wirkte auf dem leeren Grund kahl.

## Was man wissen muss

- Ein neues Bild immer verkleinern; durch den Blur sieht man keine Details,
  mehr als 1600 px Breite kostet nur Ladezeit.
- `scale-110` auf der Bildebene ist Absicht: ohne sie zeigt der Blur am Rand
  einen hellen Saum.
