# Kalender

`/kalender` (`features/calendar/pages/CalendarPage.tsx`), seit 2026-10-11 mit
Terminen wie in der Handy-App. Vorher zeigte die Seite nur Einsätze im Monat.

## Was er zeigt

- **Termine** aus `calendar_events`: privat (`event_type = 'me'`, blau) und
  Firma (`'all'`, rot) — dieselben Farben wie in der App.
- **Einsätze** (grün), Link auf `/einsatzplanung/:id`. Der Schalter
  „Einsätze anzeigen“ blendet sie in allen Ansichten aus (samt Legendenpunkt).
  Die Wahl steht im localStorage (`bautakt-calendar-assignments:<userId>`),
  gilt also je Nutzer und Browser, nicht geräteübergreifend. Standard: an.
- **Eigene Abwesenheiten** (gelb, offene gestrichelt), nur lesend, wie in der
  App. Wer sonst fehlt, steht in „Abwesenheiten“ und auf der Übersicht.

Ansichten Jahr, Monat, Woche, Tag (`?ansicht=jahr|monat|tag`, Woche ohne
Parameter; `?datum=YYYY-MM-DD`, heute ohne Parameter).

- **Monat:** Raster ab Montag, je Tag drei Einträge und „+N weitere“. Das Plus
  im Tag legt dort einen Termin an. Am Handy stehen Punkte statt Text.
- **Woche/Tag:** Zeitraster 0–24 Uhr, scrollt auf 7 Uhr, Ganztägiges oben,
  Überlappendes nebeneinander (`layoutLanes` aus der Übersicht). Klick in eine
  Stunde legt dort einen Termin an. Titel und Uhrzeit kleben oben, solange ein
  Block sichtbar ist (`sticky` im Block, Block mit `overflow-clip`, Termin-
  `<button>` mit `flex` — sonst zentriert der Button und nichts klebt).
  Standardansicht seit 2026-10-11 (vorher Monat).
- **Jahr:** zwölf kleine Monate, Punkt an Tagen mit Einträgen.

## Termin anlegen, ändern, löschen

`CalendarEventSheet` hat dieselben Felder wie das App-Formular
(`app/(tabs)/calendar/new-event.tsx`): Titel, ganztägig, Beginn/Ende,
Termintyp (nur mit `canManageAllCalendar`), Wiederholung
(keine/täglich/wöchentlich/monatlich/jährlich) mit optionalem Ende,
Erinnerung (keine/zu Beginn/15/30/60 min), Notizen. Beginn nach Ende schiebt
das Ende auf Beginn + 1 h und umgekehrt, wie in der App. Firmentermine ohne
Recht öffnen nur lesend.

- **Speichern:** neu per `insert`, sonst `update` — nie `upsert`, weil ein
  Manager fremde Firmentermine ändern, aber nicht einfügen darf.
- **Serien:** Dialog „Nur dieser Termin“ / „Alle Termine“. „Nur dieser“ schreibt
  eine Ausnahmezeile (`parent_event_id`, `recurrence_id` = ursprünglicher
  Beginn des Vorkommens). „Alle“ ändert den Serienkopf; sein Beginn verschiebt
  sich um die Änderung am Vorkommen.
- **Löschen:** roter Knopf, roter Dialog. Bei Serien „Nur dieser“ = Ausnahme
  mit `is_cancelled`, „Alle“ = Kopf löschen, Ausnahmen per CASCADE.
- Ganztägig speichert 00:00 am ersten bis 23:59 am letzten Tag.
- Die Erinnerung stellt nur die Handy-App (lokal); der Browser erinnert nicht.

Geprüft am 2026-10-11 gegen die echte Datenbank als angemeldeter
Geschäftsführer (Transaktion, nichts gespeichert): Serie anlegen, Ausnahme,
Ändern, Lesen, Löschen mit CASCADE.

## Fallstricke

⚠️ **Serien rechnen in Ortszeit, in App und Web gleich.** Ein wöchentlicher
Termin um 09:00 bleibt auch nach der Zeitumstellung um 09:00, wie
`build_morning_briefing` auf dem Server. Bis 2026-10-11 rechneten App
(`rrule`) und Web in UTC, und der Termin rutschte im Winter auf 08:00.
Ausnahmen finden ihr Vorkommen deshalb über den **lokalen Tag** von
`recurrence_id`, nicht über den exakten Zeitpunkt — so passen auch die alten,
noch in UTC gerechneten Ausnahmen. Wer das ändert, ändert
`calendarModel.ts` und `lib/calendar/recurrence.ts` der App zusammen.

- RRULE-Format byte-gleich zu `buildRecurrenceRule` der App:
  `RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T225959Z`.
- Fremde private Termine liefert RLS niemandem, auch nicht der Leitung.
- `calendar_events.id` hat keinen Default: `crypto.randomUUID()`.
- Die reine Logik (Auffalten, Regeln, Kopplung) steht in `calendarModel.ts` mit
  Test (`node --test`), ohne `@/`-Importe.
