# 2026-10-12 — Kalender: Einstellungen hinter dem Zahnrad, Einsätze blau

## Was geändert wurde

- **Einsätze sind blau**, wie in der Einsatzplanung (vorher grün). Private
  Termine sind deshalb standardmäßig lila, sonst wären sie mit Einsätzen
  verwechselbar. Firma rot, Abwesenheit gelb wie bisher.
- **Zahnrad neben „Heute“** (`CalendarSettingsPopover`): je Art ein Schalter
  „anzeigen“ und die Farbe (acht zur Wahl). Ersetzt die Legende und den
  Schalter „Einsätze anzeigen“, die eine eigene Zeile über dem Kalender
  belegten. Neu ausblendbar: private Termine, Firmentermine, Abwesenheiten.
- **Weniger Kopf:** keine Beschreibung unter „Kalender“, Abstände `gap-3`
  statt `gap-6`.
- **Woche/Tag füllen das Fenster:** das Zeitraster misst seine Oberkante und
  reicht bis zum Fensterrand (mind. 320 px). Vorher fest 592 px, dazu der hohe
  Kopf — die Woche passte nicht ins Bild und man musste erst scrollen.

## Warum

Owner-Wunsch: Einsätze überall in einer Farbe, Kalender-Optionen nicht im
Vordergrund, und der Kalender soll ohne Scrollen sichtbar sein wie die
Einsatzplanung.

## Hinweise

- Einstellungen je Nutzer und Browser im localStorage
  (`bautakt-calendar-settings:<userId>`); die alte Einsätze-Wahl wird
  übernommen.
- Geprüft per Playwright mit Messseite (danach entfernt): 1440×900 hell und
  dunkel, 1280×720 und 390×844 ohne Seiten-Scroll und ohne horizontalen
  Überlauf; Farbwechsel und Ausblenden wirken sofort und überleben Neuladen.
