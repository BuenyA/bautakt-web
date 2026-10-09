# 2026-10-09 — Kalender hängt wieder am Feld

Nach #128 öffnete der Monatskalender in Produktion immer oben links.
Zeiteintrag, Checkliste, Belegeditor und Ausgabe, hell und dunkel.

## Was geändert wurde

Der Trigger von `DatePicker` umfasst Feld und Knopf und ist damit selbst der
Anker. Ein `PopoverAnchor` daneben ist weg. Klick ins Textfeld öffnet den
Kalender nicht; der Knopf und Pfeil-runter tun es weiter.

## Warum

Radix macht den Trigger im ersten Render zum Anker und merkt sich ein
zusätzliches Anchor erst im Effect. Danach bleibt der abgebaute Trigger-Knoten
im Popper, sein Rechteck ist 0×0, die Verschiebung ist nur der `sideOffset`
(`translate(0px, 4px)`). Das Portal und `z-[70]` waren in Ordnung.

Gemessen mit Playwright (Chromium, hell und dunkel): allein, im Sheet und im
Dialog liegt der Kalender 4px unter oder über dem Feld und links bündig.
Vorher lag er bei x=0, y=4.

Issue: [#129](https://github.com/BuenyA/bautakt-web/issues/129).

## Verweise

- [datumseingabe.md](../pages/datumseingabe.md)
- [fallstricke.md](../pages/fallstricke.md)
