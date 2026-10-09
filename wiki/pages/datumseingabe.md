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
(`apps/webapp/src/components/form/dateTime.tsx`). Der Kalender ist der
shadcn-`Calendar` im `Popover`, mit `date-fns/locale/de` und Wochenanfang
Montag.

Getippt wird ins Textfeld. `31.02.2026` und `25:00` bleiben lokal und zeigen
eine Meldung; sie landen nicht im Formularzustand. Ein leeres Pflichtfeld
blockiert das Absenden mit der deutschen Meldung, nicht mit dem
Browser-Tooltip in der OS-Sprache.

`type="date"` und `type="time"` gibt es in `apps/webapp/src` nicht mehr. Das
native Feld folgt der Browsersprache und zeigte bei englischem Browser
`mm/dd/yyyy` bzw. `07:00 AM`. Listen formatieren weiter über
`lib/format.ts` mit `de-DE`.

## Bereich

Zwei Kalendertage: das Ende darf nicht vor dem Beginn liegen. Derselbe Tag
gilt. Die Meldung steht am Endfeld: „Das Ende liegt vor dem Beginn.“

Auftrag, Abwesenheit und das Enddatum eines Einsatzes nutzen das. Beim
Einsatz kommt die Uhrzeit dazu: liegt der Zeitstempel nicht nach dem Beginn,
gilt dieselbe Meldung. Ein Einsatz über mehrere Tage bleibt erlaubt.

Zeit am Auftrag und Von/Bis im Bautagebuch sind keine solchen Bereiche. Liegt
die Uhrzeit des Endes vor der des Beginns, ist das eine Nachtschicht und endet
am nächsten Tag. Der Hinweis unter dem Feld sagt das. Die Prüfung steckt in
`entryRange`, nicht im Uhrzeitfeld.

## Kalender im Sheet

Der Popover liegt im Portal. Sheet, Dialog und AlertDialog schließen nicht,
wenn der Fokus dorthin wandert (`isFloatingLayerTarget`). Der Popover steht
auf `z-[70]`, über Dialog und AlertDialog auf `z-[60]`.

Der Anker ist die ganze Zeile aus Feld und Knopf (`PopoverTrigger`). Ein
eigenes `PopoverAnchor` daneben darf nicht dazukommen: Radix trägt den
Trigger zuerst als Anker ein, das Anchor erst im Effect. Gibt der Trigger
den Anker danach ab, bleibt im Popper der abgebaute Knoten. Dessen Rechteck
ist 0×0, der Kalender öffnet oben links. Gemessen 2026-10-09: vorher
`translate(0px, 4px)`, danach am Feld (Abstand 4px, links bündig), allein,
im Sheet und im Dialog.

Das Duplikat im Bautagebuch hängt weiter am gespeicherten Kalendertag: sobald
ein gültiges Datum im Entwurf steht, läuft die Prüfung. Unfertiges Tippen
ändert den Tag nicht.
