# 2026-10-30 — „Verwerfen“ im Dialog ist rot

In „Neue E-Rechnung“ war „Verwerfen“ in der Rückfrage „Änderungen verwerfen?“
blau (Primary). Verwerfen wirft die Eingaben weg, der Knopf soll deshalb wie
Löschen aussehen.

## Was geändert wurde

- Neue gemeinsame Rückfrage `DiscardChangesDialog`. Der bestätigende Knopf ist
  `DangerButton` (`colorStatusDangerBackground3`, Schrift
  `colorNeutralForegroundOnBrand`). Keine neue Farbe, keine Theme-Abweichung.
- Dieselbe Rückfrage im Eingangsrechnungs-Editor und im `UnsavedChangesGuard`
  (Profil, Unternehmen). Texte, Reihenfolge und Schließen-Logik sind gleich
  geblieben.
- Andere Bestätigungen (Löschen, Storno, Archivieren) sind unangetastet.

## Warum

Der blaue Knopf las sich wie die sichere Hauptaktion. Rot ist in der App schon
die Farbe für endgültige Schritte.

## Verweise

- [fluent-ui.md](../pages/fluent-ui.md)
- [unternehmen-und-profil.md](../pages/unternehmen-und-profil.md#ungespeicherte-eingaben)
