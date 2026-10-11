# Kalender

`/kalender` (`features/calendar/pages/CalendarPage.tsx`), seit 2026-10-11 mit
Terminen wie in der Handy-App. Vorher zeigte die Seite nur Einsätze im Monat.

## Was er zeigt

- **Termine** aus `calendar_events`: privat (`event_type = 'me'`, blau) und
  Firma (`'all'`, rot) — dieselben Farben wie in der App.
- **Einsätze** (grün), Link auf `/einsatzplanung/:id`.
- **Eigene Abwesenheiten** (gelb, offene gestrichelt), nur lesend, wie in der
  App. Wer sonst fehlt, steht in „Abwesenheiten“ und auf der Übersicht.

Ansichten Jahr, Monat, Woche, Tag (`?ansicht=jahr|woche|tag`, Monat ohne
Parameter; `?datum=YYYY-MM-DD`, heute ohne Parameter).

- **Monat:** Raster ab Montag, je Tag drei Einträge und „+N weitere“. Das Plus
  im Tag legt dort einen Termin an. Am Handy stehen Punkte statt Text.
- **Woche/Tag:** Zeitraster 0–24 Uhr, scrollt auf 7 Uhr, Ganztägiges oben,
  Überlappendes nebeneinander (`layoutLanes` aus der Übersicht). Klick in eine
  Stunde legt dort einen Termin an.
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

⚠️ **Serien rechnen in UTC, wie die App.** Die App faltet mit der Bibliothek
`rrule` auf, die in UTC rechnet: ein wöchentlicher Termin um 08:00 steht nach
der Umstellung auf Winterzeit um 07:00. `calendarModel.ts` rechnet bewusst
genauso, sonst fände das Web die Ausnahmen der App nicht (`recurrence_id` ist
ein exakter Zeitpunkt). Wer das korrigiert, muss App und Web zusammen ändern.

- RRULE-Format byte-gleich zu `buildRecurrenceRule` der App:
  `RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T225959Z`.
- Fremde private Termine liefert RLS niemandem, auch nicht der Leitung.
- `calendar_events.id` hat keinen Default: `crypto.randomUUID()`.
- Die reine Logik (Auffalten, Regeln, Kopplung) steht in `calendarModel.ts` mit
  Test (`node --test`), ohne `@/`-Importe.
