# 2026-11-06 Angebote: Annahme mit Auftrag, Nachtrag am Auftrag (bautakt-app#187)

- Annahme-Drawer mit Auftragswahl (neu, bestehend, ohne), Hinweis bei schon verknüpftem
  Angebot. Knopf „Angebot“ oder „Nachtrag“ in der Auftragskarte, Editor liest `auftrag` und
  `art` aus der Adresse.
- Im Browser gegen einen lokalen Stack geprüft (Production-Schema ohne Daten, Migration
  `ang_quote_order`, erfundener Betrieb): neuer Auftrag übernimmt Betreff, Kunde und
  Objektadresse und steht als Link im Überblick; bestehender Auftrag verknüpft; zweites
  Hauptangebot am selben Auftrag zeigt die Meldung der Datenbank; Nachtrag-Knopf öffnet den
  Editor vorbelegt.
- Dabei geändert: Gruppe und Auswahlfeld hießen beide „Auftrag“, das Feld heißt jetzt
  „Bestehender Auftrag“.
- Offen in 2b: Auftragsbestätigung als PDF und Mail (baut auf 1d), Belegart
  `order_confirmation` aus den Rechnungen entfernen.
