# 2026-11-05 Angebote: Editor und Umschalten (web#292)

- Editor unter `/angebote/neu` und `/angebote/:id/bearbeiten`: Kunde, Art, Auftrag,
  Betreff, Termine, Vertragsgrundlage, Abrechnungsart, Objektadresse und Texte
  (optional), Leistungsverzeichnis mit Titel, Untertitel, Position und Text, Steuerart,
  Nachlass und Summen. Festschreiben mit Rückfrage, danach nur neue Version.
- Umschalten: Leistenpunkt „Angebote“ vor „Aufträge“, Liste und Detail von
  `/angebote/vorgaenge` nach `/angebote`, alter Reiter unter Rechnungen und
  `type="quote"` im Belegeditor entfernt, Schnellaktion „Neues Angebot“ an
  `canCreateQuotes`. Die Auftragsseite zeigt Angebote und Nachträge des Auftrags.
- Drag & Drop mit `@dnd-kit` (core 6.3.1, sortable 10.0.0, utilities 3.2.2).
- Erste Messung mit 500 Positionen: 0,8 s je Tastendruck. Ursache und Umbau stehen in
  `wiki/pages/angebote.md`; danach 17 ms.
- Im Browser gegen einen lokalen Stack geprüft (Production-Schema ohne Daten, Migration,
  Testdaten über die echten RPCs): Anlegen, Ziehen in einen anderen Titel, Speichern,
  Neuladen, Festschreiben mit Serversumme gleich Editorsumme, Sperre danach, neue
  Version, Entwurf verwerfen, Abbruch beim Speichern (Netz weg und ungültiger Baum),
  § 13b, Kleinunternehmer, Mitarbeiter ohne Recht per Adresse, fremder Betrieb.
