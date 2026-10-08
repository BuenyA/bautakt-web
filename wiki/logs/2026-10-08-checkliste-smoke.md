# 2026-10-08 — Checkliste: Löschen abwarten, Abhaken sofort

Live-Smoke von [#116](https://github.com/BuenyA/bautakt-web/pull/116). Keine
Schemaänderung.

## Was geändert wurde

- Löschen eines Checklistenpunkts nimmt ihn erst aus der Liste, wenn der
  Server die Ganzliste ohne ihn bestätigt hat. Dialog und Panel bleiben offen,
  der Knopf zeigt „Wird gelöscht …“.
- Abhaken kippt die Checkbox sofort im Query-Cache. Ein Fehler stellt nur
  diesen Punkt zurück. Die Schreibvorgänge bleiben serialisiert und lesen vor
  jedem Schreiben neu.
- Die Personenauswahl öffnet nach oben, „Punkt löschen“ sitzt in der Fußleiste.
- Der Bestätigungsdialog liegt über dem Sheet (`z-[60]`, `duration-150`). Das
  Sheet schließt nicht, weil der Dialog den Fokus bekommt.
- Dasselbe Warten gilt für Löschen von Notiz, Zeit und Material am Auftrag.

## Warum

Der Dialog liegt im Portal. Fokus außerhalb schließt das Sheet, das Formular
wird abgebaut, die Ganzlisten-Anfrage läuft noch. Ein Neuladen bricht sie ab,
der Punkt ist wieder da. Abhaken wartete auf dieselbe Runde und sprang erst
nach etwa 1,5 s um.

Issue: [#119](https://github.com/BuenyA/bautakt-web/issues/119).

## Verweise

- [auftragscheckliste.md](../pages/auftragscheckliste.md)
- [fallstricke.md](../pages/fallstricke.md)
