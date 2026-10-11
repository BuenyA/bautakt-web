# Datum und Uhrzeit in Formularen

Jedes Datums- und Uhrzeitfeld in `apps/webapp` zeigt deutsch, egal welche
Sprache der Browser hat. Der gespeicherte Wert bleibt, was Supabase und die
Handy-App schon kennen.

## Anzeige und Wert

| Feld    | Anzeige      | Wert nach oben      |
| ------- | ------------ | ------------------- |
| Datum   | `TT.MM.JJJJ` | `YYYY-MM-DD`        |
| Uhrzeit | `HH:MM`      | `HH:MM`, 24 Stunden |

`DatePicker`, `DateRangePicker` und `TimeInput` liegen in `@bautakt/ui`. Die
App reicht die Texte aus `validation.json` durch
(`apps/webapp/src/components/form/dateTime.tsx`). Seit 2026-10-10 ist der
Kalender Fluents `Calendar` (`@fluentui/react-calendar-compat`) in einem
Fluent-`Popover`, Wochenanfang Montag, erste Kalenderwoche nach ISO
(`FirstWeekOfYear.FirstFourDayWeek`). Monats- und Tagesnamen kommen aus `Intl`
mit `de-DE` (`germanCalendarNames` in `packages/ui/src/lib/date-time.ts`, mit
Test), nicht aus der Browsersprache. Maske und Prüfung (`use-masked-field.ts`,
`date-time.ts`) sind unverändert; nur die Optik ist Fluent.

Getippt wird ins Textfeld. `31.02.2026` und `25:00` bleiben lokal und zeigen
eine Meldung; sie landen nicht im Formularzustand. Ein leeres Pflichtfeld
blockiert das Absenden mit der deutschen Meldung, nicht mit dem
Browser-Tooltip in der OS-Sprache.

Acht Ziffern ohne Punkte sind `TTMMJJJJ`. Die Punkte setzt die Maske beim
Tippen, überzählige Ziffern eines Feldes rutschen ins nächste. Aus
`15082026` wird `15.08.2026`, das Jahr wird nicht abgeschnitten. Mehr als
acht Ziffern bleiben bei vier Stellen für das Jahr.

Der gewählte Tag trägt Fluents Auswahlfläche; `aria-selected` steht an der
Tageszelle (`td`), die Fläche am Knopf darin. Heute markiert Fluent mit
`fui-CalendarDayGrid__dayIsToday`. Der Kalender öffnet im Monat des aktuellen
Werts, weil er bei jedem Öffnen neu gemountet wird.

`type="date"` und `type="time"` gibt es in `apps/webapp/src` nicht mehr. Das
native Feld folgt der Browsersprache und zeigte bei englischem Browser
`mm/dd/yyyy` bzw. `07:00 AM`. Listen formatieren weiter über
`lib/format.ts` mit `de-DE`.

## Bereich

Zwei Kalendertage: das Ende darf nicht vor dem Beginn liegen. Derselbe Tag
gilt. Die Meldung lautet „Das Ende liegt vor dem Beginn.“ Beim Bereich aus
zwei Feldern steht sie am Endfeld. Beim Einsatz steht sie unter beiden
Spalten.

Auftrag, Abwesenheit und das Enddatum eines Einsatzes nutzen das. Beim
Einsatz kommt die Uhrzeit dazu: liegt der Zeitstempel nicht nach dem Beginn,
gilt dieselbe Meldung und Speichern ist gesperrt. Die Meldung steht in einer
eigenen Zeile unter beiden Spalten, damit „Ende, Uhrzeit“ bündig bleibt.
Ein Einsatz über mehrere Tage bleibt erlaubt.

Im Belegeditor gilt dasselbe für Fällig vor dem Rechnungsdatum. Die Meldung
steht in einer eigenen Zeile über den Datumsfeldern. Direkt unter dem
Fällig-Feld deckt sie der Kalender zu, der nach unten aufgeht.

Ein gespeicherter Entwurf ohne Rechnungsdatum bleibt im Editor leer.
Platzhalter: „Wird beim Ausstellen gesetzt“. Hinweis: „Noch nicht
ausgestellt“. Die Liste sagt dann „Nicht ausgestellt“. Speichern schreibt
`null` (`issueDate || null` in `useDocumentEditor.ts`), nicht stillschweigend
heute. `finalize_sales_document` setzt das Datum beim Festschreiben selbst
(`issue_date = coalesce(issue_date, CURRENT_DATE)`). Nummernvergabe und
Fälligkeitsdatum hängen daran nicht; die Druckansicht zeigt das gespeicherte
Datum. Ein neuer Beleg startet weiter mit dem heutigen Datum als sichtbarem
Vorschlag — das ist eine Vorbelegung, kein Ersatz für ein leeres gespeichertes
Datum. Die Prüfung „Fällig vor Rechnungsdatum“ läuft nur, wenn ein
Rechnungsdatum gesetzt ist.

Zeit am Auftrag und Von/Bis im Bautagebuch sind keine solchen Bereiche. Liegt
die Uhrzeit des Endes vor der des Beginns, ist das eine Nachtschicht und endet
am nächsten Tag. Der Hinweis unter dem Feld sagt das. Die Prüfung steckt in
`entryRange`, nicht im Uhrzeitfeld.

## Kalender in Drawer und Dialog

Stand 2026-10-10. Fluent stapelt seine Ebenen selbst: ein Klick in den
Kalender schließt weder den Drawer noch den Dialog dahinter, und Escape
schließt zuerst den Kalender, dann die Ebene darunter. Die eigene Ausnahme
`isFloatingLayerTarget` und die z-Indizes aus der shadcn-Zeit sind deshalb
entfallen.

Der Popover hängt an der ganzen Zeile aus Feld und Knopf
(`positioning.target`). Die Zeile kommt über State statt Ref an den Popover,
weil er den Anker beim Rendern braucht. Beim Öffnen fängt der Kalender den
Fokus (`trapFocus`) und setzt ihn auf den gewählten Tag (sonst heute); nach der
Wahl geht der Fokus ins Feld zurück. Fluent lässt den Popover rund 300 ms
einfahren; gemessen 2026-10-10 steht er danach bündig unter dem Feld (Abstand
0px, links 1px), allein, im Drawer und im Dialog
(`apps/webapp/e2e/date-picker-popover.spec.ts`).

Bis 2026-10-10 galt hier eine Radix-Falle: ein zusätzliches `PopoverAnchor`
neben dem Trigger ließ den Kalender bei (0, 0) öffnen. Mit Fluent gibt es kein
Anchor-Rennen mehr; die Messung im E2E-Test bleibt trotzdem.

Das Duplikat im Bautagebuch hängt weiter am gespeicherten Kalendertag: sobald
ein gültiges Datum im Entwurf steht, läuft die Prüfung. Unfertiges Tippen
ändert den Tag nicht.
