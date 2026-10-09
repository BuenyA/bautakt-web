# 2026-10-09 — Fällig-Meldung und leeres Rechnungsdatum

Aus dem Live-Smoke von #130.

## Was geändert wurde

Die Meldung „Das Fälligkeitsdatum liegt vor dem Rechnungsdatum.“ steht im
Belegeditor über den Datumsfeldern. Der Kalender öffnet weiter nach unten und
deckt sie nicht mehr zu.

Ein gespeicherter Entwurf ohne `issue_date` bleibt im Editor leer, mit
Platzhalter „Wird beim Ausstellen gesetzt“ und Hinweis „Noch nicht
ausgestellt“. Speichern schreibt `null`. Die Prüfung Fällig-vor-Rechnung
läuft nur, wenn ein Rechnungsdatum gesetzt ist.

## Warum

Die Meldung hing am Fällig-Feld, direkt unter der Eingabe. Der Popover liegt
darüber.

`finalize_sales_document` setzt `issue_date = coalesce(issue_date, CURRENT_DATE)`,
vergibt die Nummer aus `document_number_sequences` und lässt `due_date` stehen.
Es gibt keinen Trigger, der die Fälligkeit aus dem Rechnungsdatum rechnet.
Druckansicht und Detail zeigen das gespeicherte Datum. Deshalb darf der Editor
ein leeres Datum leer lassen: das Festschreiben setzt es selbst. Ein neuer
Beleg startet weiter mit heute, weil das ein sichtbarer Vorschlag ist und
beim Speichern als Datum stehen bleibt.

Issue: [#131](https://github.com/BuenyA/bautakt-web/issues/131).

## Verweise

- [datumseingabe.md](../pages/datumseingabe.md)
- [fallstricke.md](../pages/fallstricke.md)
