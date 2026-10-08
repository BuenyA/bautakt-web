# 2026-10-08 — Checkliste am Auftrag

Die Auftragsdetailseite liest die eine Checkliste eines Auftrags und legt
Punkte an, hakt sie ab, benennt sie um, weist sie zu und löscht sie.
Dieselben Tabellen schreibt die Handy-App.

## Was geändert wurde

- Block „Checkliste“ auf `/auftraege/:id`, unter den Notizen. Zeile mit
  Kästchen, Titel, Fälligkeit, Zuweisung. „2 von 3 erledigt“ über der Liste.
- Seitenpanel für Titel, Datum und Beschäftigung. Abhaken speichert direkt
  auf der Zeile. Löschen fragt vorher nach.
- Die Liste entsteht mit dem ersten Punkt. Gespeichert wird die ganze
  Item-Liste: Upsert, dann Delete der fehlenden Ids. `modified_at` am Parent
  und an geänderten Punkten. Client-UUIDs.
- Sichtbar mit `canViewChecklist` oder `canEditChecklist`. Schreiben nur mit
  `canEditChecklist`, ohne Eigentümer-Prüfung.

## Warum

Ohne den Block sieht das Web die Punkte nicht, die die Baustelle am Auftrag
führt, und kann keinen nachtragen. Fälligkeit und Zuweisung sind in den
Spalten und in der Handy-App; der Zuweisungs-Trigger bleibt serverseitig.
Die Ganzlisten-Speicherung ist die Sync-Semantik von `checklist.upsert`. Ein
einzelnes Update pro Punkt würde die Handy-App nicht am Löschen hindern und
umgekehrt eine zweite Schreibweise einführen.

Issue: [#56](https://github.com/BuenyA/bautakt-web/issues/56).

## Verweise

- [auftragscheckliste.md](../pages/auftragscheckliste.md)
- Code: `apps/webapp/src/features/orders/OrderChecklist.tsx`,
  `OrderChecklistSheet.tsx`, `orderChecklistDraft.ts`,
  `useOrderChecklistMutations.ts`
