# 2026-10-05 — Einsatz anlegen und löschen

Unter `/einsaetze` gab es nur die Leseliste und das Detail. Anlegen und
Löschen fehlten. Gemeint sind Einsätze (`work_assignments`), nicht Aufträge —
Auftrag anlegen gibt es seit dem 24.09. und bleibt unverändert.

Anlegen schreibt dieselbe Zeile wie die Handy-App, inklusive Zuordnung in
`work_assignment_employees`, aus einem Seitenpanel. Die Id setzt der Client,
weil die Spalte kein Default hat.

Löschen sitzt auf der Detailseite. Es bleibt aus, sobald Zeiteinträge am
Einsatz hängen oder das Konto sie nicht vollständig sehen kann: der
Fremdschlüssel löscht die Zeiten per Kaskade mit, und die Kaskade prüft die
Select-Policy des Nutzers nicht. Die Zuordnung der Mitarbeiter fällt mit dem
Einsatz weg. Ein weiches Löschen gibt es auf der Tabelle nicht; eines
einzuführen wäre eine Schemaänderung in `bautakt-app`.

Recht für beide Knöpfe ist `canManageWorkAssignments`, dasselbe, das die
Policies auf den beiden Tabellen verlangen.

Issue: [#43](https://github.com/BuenyA/bautakt-web/issues/43).
