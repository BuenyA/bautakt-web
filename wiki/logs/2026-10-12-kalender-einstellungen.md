# 2026-10-12 — Kalender: Einstellungen hinter dem Zahnrad, Einsätze blau

## Was geändert wurde

- **Einsätze sind blau**, wie in der Einsatzplanung (vorher grün). Private
  Termine sind deshalb standardmäßig lila, sonst wären sie mit Einsätzen
  verwechselbar. Firma rot, Abwesenheit gelb wie bisher.
- **Zahnrad neben „Heute“** (`CalendarSettingsPopover`): je Art ein Schalter
  „anzeigen“ und die Farbe (acht zur Wahl). Ersetzt die Legende und den
  Schalter „Einsätze anzeigen“, die eine eigene Zeile über dem Kalender
  belegten. Neu ausblendbar: private Termine, Firmentermine, Abwesenheiten.
- **Passt ohne Scrollen:** Das Raster hat dieselbe feste Höhe wie in der
  Einsatzplanung (zwölf Stunden). Die Beschreibung unter „Kalender“ bleibt wie
  auf allen Seiten (Owner-Vorgabe); Platz kommt aus der fehlenden Legenden-Zeile,
  kleineren Ansicht-Tabs und `gap-3` zwischen Werkzeugleiste und Raster.
  Ein erster Versuch ließ das Raster bis zum Fensterrand wachsen und strich die
  Beschreibung — verworfen, der Owner wollte es wie die Einsatzplanung.

## Warum

Owner-Wunsch: Einsätze überall in einer Farbe, Kalender-Optionen nicht im
Vordergrund, und der Kalender soll ohne Scrollen sichtbar sein wie die
Einsatzplanung.

## Hinweise

- Einstellungen je Nutzer und Browser im localStorage
  (`bautakt-calendar-settings:<userId>`); die alte Einsätze-Wahl wird
  übernommen.
- Geprüft per Playwright mit Messseite (danach entfernt): bei 1440×900 passt
  die Woche auch mit Ganztägig-Zeile ohne Seiten-Scroll, Raster 592 px wie in
  der Einsatzplanung; 390 px ohne horizontalen Überlauf; Farbwechsel und
  Ausblenden wirken sofort und überleben Neuladen.
