# 2026-10-11 — Zeiten ohne eigenen Bereich, neue Mitarbeiterseite

## Was geändert wurde

- „Zeiten“ ist aus der Seitenleiste und der Schnellsuche verschwunden,
  `TimesListPage` ist gelöscht. `/zeiten` leitet um: mit `?order=` auf den
  Auftrag, sonst auf die Übersicht.
- Im Auftrag steht über den Einträgen „Stunden je Mitarbeiter“ mit Summe.
- Neu: Mitarbeiterseite `/mitarbeiter/:id` mit Stammdaten und Zeiten
  ([mitarbeiterseite.md](../pages/mitarbeiterseite.md)). Das Verzeichnis
  führt per Klick dorthin.
- `useTimeEntries` nimmt `{ orderId }` oder `{ employmentId }`.

## Warum

Owner-Vorgabe: Zeiten sind kein eigener Bereich, sondern gehören zum Auftrag
oder zum Mitarbeiter.

## Was man wissen muss

Wer weder Team-Zeiten noch Finanzen sehen darf, findet seine eigenen Zeiten in
der Web-App nur noch im jeweiligen Auftrag. Erfasst wird ohnehin meist in der
Handy-App.
