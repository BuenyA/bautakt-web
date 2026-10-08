# 2026-10-08 — Bautagebuch: Duplikat, Anwesenheit, Sperrtext

Der Live-Smoke von #120 hat drei Lücken im Bautagebuch gezeigt. Keine neue
Funktion, kein Schema.

## Was geändert wurde

- Der Hinweis auf einen zweiten Bericht am selben Tag steht, sobald das Datum
  im Panel auf einen belegten Tag zeigt. Geprüft wird die geladene Liste und
  eine Abfrage auf `daily_reports` nach Auftrag und Datum. Speichern ist dann
  aus. Die eigene Zeile zählt beim Bearbeiten nicht. Ein Unique-Verstoß
  (`23505`) zeigt denselben Text. „Vorhandenen Bericht öffnen“ lädt die Zeile
  nach, wenn die Liste sie noch nicht hat.
- „Bericht anlegen“ bleibt aus, bis die Mitarbeiter geladen sind. Ist das
  Panel trotzdem offen und die Anwesenheit unangetastet, kommt die eigene
  aktive Anstellung nach, sobald die Liste da ist. Eine veraltete Vorauswahl
  wird dabei ersetzt.
- Beide Sperrtexte im Löschdialog bleiben bei der strengen Regel. Der zweite
  lautet jetzt „Dieser Bericht hat verknüpfte Einträge und kann im Web noch
  nicht gelöscht werden.“ Darunter stehen die Anzahlen wie auf der Karte.

## Warum

Der Hinweis kam erst nach dem Speichern, deshalb fehlte er im Smoke auch bei
schon geladener Karte. Die Anwesenheit wurde gesetzt, bevor die Anstellungen
da waren, und blieb dann leer. Die Sperrtexte nannten die Arten, aber nicht
die Zahlen.

Issue: [#123](https://github.com/BuenyA/bautakt-web/issues/123).

## Verweise

- [bautagebuch.md](../pages/bautagebuch.md)
- [fallstricke.md](../pages/fallstricke.md)
