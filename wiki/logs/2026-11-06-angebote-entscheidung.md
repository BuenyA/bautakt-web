# 2026-11-06 Angebote: Entscheidung erfassen (bautakt-app#186)

- Detailseite: Annahme, Ablehnung, Zurückziehen und Zurücknehmen über Drawer, Karte
  „Entscheidung“ mit beiden Zeitpunkten, Art, Grund, Notiz, Auswahl und Nachweis.
- Im Browser gegen einen lokalen Stack geprüft (Production-Schema ohne Daten, Migration
  `ang_quote_decision`, erfundener Betrieb, Angebote über die echten RPCs): Annahme mit
  Unterschrift und zwei Wahlpositionen, Ablehnung, Privatkunde gesperrt, Zurücknehmen mit
  Begründung, erneute Annahme. Als Polier keine Knöpfe, Karte sichtbar.
- Dabei gefunden: Nach Zurücknehmen und erneuter Annahme zeigte die Karte beide
  Unterschriften. Jetzt nur der Nachweis der geltenden Entscheidung (`currentEvidence`).
- Lokal fehlten `company_roles` (Seed lief ohne Trigger): ohne Rollenzeile zeigt die Web-App
  „Kein Zugriff“, die Datenbank lässt den Geschäftsführer trotzdem schreiben.
