# 2026-10-12 — Abwesenheiten ablehnen, stornieren, bearbeiten, löschen

## Was geändert wurde

- Übersicht und `/abwesenheiten`: offene Anträge lassen sich jetzt ablehnen,
  mit freiwilligem Grund.
- `/abwesenheiten`: Menü pro Zeile mit Bearbeiten, Stornieren und Endgültig
  löschen; Grund unter dem Status abgelehnter Anträge.
- DB (bautakt-app `20261011213845_absence_edit_delete`): Bearbeiten-Pfad im
  Integritäts-Trigger, DELETE-Policy, Konfliktprüfung zählt beim Bearbeiten
  nur neu getroffene Einsätze.

## Warum

Owner-Wunsch: bisher ging im Web nur „Genehmigen“. Entscheidungen: Ablehnen
mit freiwilligem Grund, Stornieren und endgültiges Löschen beide anbieten,
Bearbeiten von Art, Zeitraum und Notiz bei offenen und genehmigten.

## Geprüft

- Echte DB, zurückgerollt (GF der Testfirma, ein Mitarbeiter mit
  entzogenem Recht): alle Wege wie in [abwesenheiten.md](../pages/abwesenheiten.md)
  beschrieben; Ablehnen erzeugt die Benachrichtigung; Rückzug des eigenen
  Antrags geht weiter.
- Harness mit Testdaten: Tabelle, Menü, Ablehnen-, Löschen-Dialog,
  Bearbeiten-Panel; hell, dunkel, 390 px; keine Konsolenfehler. Den Knopf
  in der Übersicht nicht im Browser angesehen, nur Typprüfung.
