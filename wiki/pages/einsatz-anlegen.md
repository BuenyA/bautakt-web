# Einsatz anlegen und löschen

Die Einsatzliste legt einen Einsatz an, die Detailseite löscht ihn. Die Zeile
liegt in `work_assignments`, die Zuordnung in `work_assignment_employees` —
dieselben Tabellen, die die Handy-App liest. Die Liste und das Detail bleiben
sonst, wie sie seit der Demo sind.

## Anlegen

Ein Seitenpanel auf `/einsaetze`, Knopf „Einsatz anlegen“, auch im leeren
Zustand. Das Panel ist nur gemountet, solange es offen ist, und startet deshalb
jedes Mal leer (`AssignmentSheet`). Vorbelegt sind der heutige Tag und 07:00
bis 16:00, wie beim Zeiteintrag. Beginn und Ende haben eigene Daten, ein
Einsatz darf also über mehrere Tage gehen.

Pflicht laut Schema, gemessen 2026-10-05: `id`, `company_id`, `order_id`,
`starts_at`, `ends_at`, `created_by_user_id`. `work_assignments.id` hat kein
`DEFAULT gen_random_uuid()` — der Client setzt `crypto.randomUUID()`, wie bei
den anderen Tabellen, die die Handy-App offline anlegt
([fallstricke.md](fallstricke.md)). `created_by_user_id` ist die Id des
angemeldeten Nutzers. Die Insert-Policy verlangt, dass sie `auth.uid()` ist.
`note` geht leer als leerer Text mit (Spalten-Default `''`). Der Check
`ends_at > starts_at` gilt auch im Formular: Ende vor Beginn oder gleicher
Zeitpunkt wird abgelehnt.

Mitarbeiter sind keine Pflicht. Eine Zeile ohne Eintrag in
`work_assignment_employees` ist der Zustand, den die Liste als „Keine
Zuweisung“ schon anzeigt. Ausgeschiedene (`ended_at`) stehen nicht zur Auswahl,
wie bei Zeit und Abwesenheit. Schlägt die Zuordnung nach dem Einsatz fehl, wird
der Einsatz wieder gelöscht — sonst bliebe eine Zeile, die das Formular gerade
als Fehler gemeldet hat. Der Trigger `notify_work_assignment_assigned` läuft
beim Eintrag mit, wie in der Handy-App.

Der Auftrag kommt aus allen Aufträgen, die die Select-Policy zeigt. Das
Formular filtert den Status nicht: die Spalte `order_id` nimmt jedes Auftrag,
das der Nutzer sehen darf.

## Löschen

Knopf „Einsatz löschen“ auf `/einsaetze/:id`, danach ein Dialog. Die
Mitarbeiterzuordnung fällt mit dem Einsatz weg (`ON DELETE CASCADE` auf
`work_assignment_employees`, gemessen 2026-10-05).

Zeiten nicht. `time_entries.work_assignment_id` löscht per `ON DELETE CASCADE`,
und RLS auf `time_entries` ist nicht `FORCE` (gemessen 2026-10-05). Ein
Löschen nähme die gebuchten Zeiten mit, auch solche, die das Konto nicht sieht.
Die Oberfläche zählt deshalb zuerst und löscht nur, wenn keine Zeile an diesem
Einsatz hängt. Sie zählt nur, wenn das Konto alle Zeiten des Betriebs sehen
kann — `canTrackTimeForTeam`, `canViewWageCosts` oder `canViewCompanyFinance`.
Fehlt das, oder ist die Zahl größer als null, bleibt der Einsatz stehen und der
Dialog sagt, warum. Zählen und Löschen sind zwei Abfragen; eine Zeit, die
genau dazwischen entsteht, kann die Kaskade noch mitnehmen. Das ist die Grenze
ohne eigene Funktion in der Datenbank.

Eine von RLS verschluckte Löschung liefert keinen Fehler. Die Abfrage verlangt
die gelöschte Id zurück und behandelt ein leeres Ergebnis als Fehlschlag.

Es gibt kein `deleted_at` auf `work_assignments`. Ein weiches Löschen wäre eine
Schemaänderung in `bautakt-app`.

## Recht

Knopf und leerer Zustand hängen an `usePermission('canManageWorkAssignments')`.
Das blendet sie aus und ist keine Kontrolle. Insert, Update und Delete auf
`work_assignments` sowie Insert und Delete auf `work_assignment_employees`
verlangen dasselbe Recht. Lehnt die Datenbank ab, zeigt das Formular „Dafür
fehlt dir die Berechtigung.“ (`readableDbError`, Postgres `42501`).

Welches Recht welche Rolle trägt, steht im Wiki von `bautakt-app`:
<https://github.com/BuenyA/craft/blob/main/wiki/pages/berechtigungen-und-rollen.md>.
Wie das Web die Flags liest: [berechtigungen-im-web.md](berechtigungen-im-web.md).

_Stand 2026-10-05, Rollen mit `canManageWorkAssignments` im Projekt:_ Bauleiter,
Polier, Geschäftsführer. Alle drei haben auch `canTrackTimeForTeam`, der
Zeiten-Guard greift für sie also über die Zählung und nicht über die Sperre
„nicht sichtbar“.

## Nach dem Speichern

Die Mutation invalidiert `['assignments', companyId]`. Liste und Detail hängen
an diesem Präfix. Danach Navigation auf `/einsaetze/:id`. Nach dem Löschen
zurück auf `/einsaetze`.

## Code

- `apps/webapp/src/features/assignments/AssignmentSheet.tsx`
- `apps/webapp/src/features/assignments/assignmentDraft.ts`
- `apps/webapp/src/features/assignments/AssignmentDeleteDialog.tsx`
- `apps/webapp/src/features/assignments/useDeleteAssignment.ts`
- `apps/webapp/src/features/assignments/pages/AssignmentsListPage.tsx`
- `apps/webapp/src/features/assignments/pages/AssignmentDetailPage.tsx`
