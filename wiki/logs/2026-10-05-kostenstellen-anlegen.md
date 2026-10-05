# 2026-10-05 — Kostenstellen anlegen, löschen, Auftragssumme

`/kostenstellen` hat nur Nummer und Bezeichnung gelesen. Anlegen und Löschen
fehlten, und an der Zeile war nicht zu sehen, wie viele Aufträge darauf zeigen.

Das ist eine Lücke, kein Rückbau: `useCostCenters` hat `id, code, name`
selektiert, die Seite hatte keinen Sheet und keine Mutation. Insert und Delete
erlaubt die Datenbank schon (`canManageCostCenters` oder Chef). Eine Migration
braucht es dafür nicht.

Gelöscht wird nur, wenn kein Auftrag die Kostenstelle referenziert.
`orders.cost_center_id` ist `ON DELETE SET NULL`; ohne die Sperre verschwindet
die Zuordnung still. Die angezeigte Summe ist die `contract_sum` der
verknüpften Aufträge, nicht eine Zahlung und nicht der Lohn. Beides hängt
nicht an `cost_centers` und wäre über die Lese-Policies für manche Nutzer
unvollständig. Steht keine Auftragssumme, zeigt die Zelle einen Strich.

Issue: [#42](https://github.com/BuenyA/bautakt-web/issues/42).
