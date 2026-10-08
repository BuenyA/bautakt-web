# 2026-10-08 — Zeit nachtragen und Notiz-Panel: Smoke

Live-Smoke von [#49](https://github.com/BuenyA/bautakt-web/pull/49) und dem
Notiz-Panel aus [#50](https://github.com/BuenyA/bautakt-web/pull/50) an
Spahrbau. Keine Schemaänderung.

## Pause bleibt rot

`timeEntryIssue` lief nur beim Speichern. Die Meldung „Pause ≥ Bruttodauer“
blieb stehen, nachdem die Pause schon kürzer war. Nach dem ersten fehlgeschlagenen
Speichern hängt die Meldung am aktuellen Entwurf: Datum, Beginn, Ende, Pause
und die übrigen Feldregeln laufen bei jeder Änderung neu, die Meldung verschwindet,
sobald sie nicht mehr zutrifft.

## Erstes Öffnen am Auftrag

Auftragsliste und Mitarbeiter starteten erst mit dem Panel. Bis die Abfrage
sitzt, hat das Auftrags-Select keine passende Option: der Trigger bleibt leer,
auch wenn die Id schon im Entwurf steht. Die Mitarbeiterliste las `isPending`.
In TanStack Query v5 bleibt eine Abfrage mit `enabled: false` pending
(`fetchStatus: 'idle'`, kein Fetch) und zeigt dauerhaft „Wird geladen …“.
Ein zweites Öffnen trifft den Cache.

`OrderTimes` und `/zeiten` laden beide Listen, sobald das Konto Zeiten anlegen
darf — das erste Öffnen ist dann kein Kaltstart mehr. Der Auftragsname kommt
vom Detail in `SelectValue`, nicht erst aus der Liste. Eine leere
`onValueChange` verwirft die vorbelegte Id nicht. Sobald die passende Option
da ist, wird das Select neu gemountet.

## Abgerechnet

Liste auf `/zeiten` und Karten am Auftrag trugen das Badge schon
(`billed_document_id`). Im Panel stand nur der Satz, kein Badge. Es steht jetzt
neben dem Titel. Die 22 abgerechneten Spahrbau-Zeilen liegen zwischen dem
13.07. und dem 10.08.2026, außerhalb von Woche und Monat im Oktober. Am
Auftrag ist die Liste nicht auf die Woche begrenzt.

## Notiz-Panel bei 1280px

Das gemeinsame Seitenpanel (`sheet.tsx`, rechts `right-0` und `w-full` /
`sm:max-w-md`) klebte am Viewport. Radix `RemoveScroll` setzt am `body` beim
Öffnen `overflow: hidden` und `margin-right` in der Breite der Scrollbar
(`--removed-body-scroll-bar-size`, hier 15px). Die rechte Kante des Panels lag
in diesem Rand, der Body schneidet ihn ab. Gemessen bei 1280px: Body-Breite
1265px, Panel-Rechtskante vorher 1280px.

Die rechte Kante nutzt jetzt die Variable. `max-width` ist der Viewport abzüglich
dieses Rands, ab `sm` höchstens 28rem. Dieselbe Kappe gilt links, damit die
mobile Leiste nicht in den Rand läuft. Bei 1280px bleibt das Panel 448px und
endet auf der Body-Kante, hell und dunkel. Schmaler als `sm` füllt es den
sichtbaren Rest, nicht das Stück unter der Scrollbar.

Issue: [#46](https://github.com/BuenyA/bautakt-web/issues/46).
