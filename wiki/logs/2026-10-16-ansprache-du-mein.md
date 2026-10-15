# 2026-10-16 — Ansprache: „du“ und „mein“

## Was geändert wurde

- Alle Sie-Formen in der Webapp sind geduzt (Anmeldung, Fehlermeldungen,
  „Bitte prüfe die Verbindung …“, „ist für dich nicht sichtbar“).
- Seitenbeschreibungen sprechen aus Sicht des Nutzers: „Aufträge und Angebote
  meines Betriebs“, „Ausgangsrechnungen meines Betriebs“, „Beschäftigte meines
  Betriebs“ … statt „Ihres/des Betriebs“. Der Kalender heißt „Mein Kalender“.
- Die Regel steht in `AGENTS.md` („Tone of voice“): Überschriften und
  Beschreibungen mit „mein“, Sätze an den Nutzer mit „du“. Texte an Kunden des
  Betriebs (Belege, Kunden-Mails, Marketing, Rechtliches) bleiben beim „Sie“.

## Warum

Nutzerwunsch: Die App soll sich wie _meine_ App anfühlen, nicht wie ein Amt.

## Geprüft

`npm run check` grün (Test `authErrors` an die neuen Texte angepasst).
