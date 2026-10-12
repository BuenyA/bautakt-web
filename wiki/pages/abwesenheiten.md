# Abwesenheiten: genehmigen, ablehnen, bearbeiten, löschen

`/abwesenheiten` (`features/team/pages/AbsencesPage.tsx`) und die Anträge auf
der Übersicht (`overview/components/TodoPanel.tsx`). Alle Aktionen nur mit
`canManageAbsences`; die verbindliche Grenze sitzt in der Datenbank
(bautakt-app `20260806120000_absences.sql`, erweitert in
`20261011213845_absence_edit_delete.sql`).

## Was geht, und wo es geprüft wird

| Aktion            | Status vorher         | Weg                                                   |
| ----------------- | --------------------- | ----------------------------------------------------- |
| Eintragen         | –                     | RPC `create_absence_for_employment`, sofort genehmigt |
| Genehmigen        | ausstehend            | RPC `approve_absence`                                 |
| Ablehnen          | ausstehend            | `update` → `abgelehnt`, Grund in `decision_note`      |
| Stornieren        | genehmigt             | `update` → `storniert`, bleibt in der Liste           |
| Bearbeiten        | ausstehend, genehmigt | `update` von `type`, `start_date`, `end_date`, `note` |
| Endgültig löschen | jeder                 | `delete`, Policy „Managers can delete absences“       |

- Der Trigger `enforce_absence_update_integrity` entscheidet, was ein UPDATE
  darf. Statuswechsel setzen Art und Zeitraum immer zurück, auch der
  Plain-UPDATE aus der Offline-Outbox der Handy-App. Nur ein UPDATE **ohne**
  Statuswechsel ist „Bearbeiten“, und dabei bleibt die Entscheidung
  (`decided_*`, `decision_note`) stehen. Abgelehnte und Stornierte werfen
  `INVALID_STATUS_TRANSITION`, wer kein Recht hat, `FORBIDDEN`.
- Wird eine genehmigte Abwesenheit auf einen Tag mit Einsatz des Mitarbeiters
  verschoben, kommt `ABSENCE_WORK_ASSIGNMENT_CONFLICT`. Nur neu getroffene
  Einsätze zählen; eine Notiz-Änderung an einem Altfall geht (siehe
  [einsatzplanung.md](einsatzplanung.md#abwesenheit-sperrt-einteilen)).
- Ablehnen benachrichtigt den Mitarbeiter (`trg_z_absence_decided_notify`).
  Bearbeiten ändert den Status nicht und benachrichtigt deshalb nicht.
- PostgREST meldet RLS-Ablehnungen bei UPDATE/DELETE nicht. Alle Mutationen in
  `useAbsences.ts` nehmen deshalb `select('id')` und werten 0 Zeilen als
  `NOT_UPDATED`.

## Oberfläche

- Detailseite `/abwesenheiten/:id` (`AbsenceDetailPage.tsx`, Owner-Wunsch
  2026-10-12): Profilbild und Name vorn wie in der Einsatzplanung (mit
  `canManageEmployees` ein Link zum Mitarbeiter), darunter Status und
  Zeitraum. Oben rechts je nach Status Zurück, Bearbeiten (offen,
  genehmigt), Stornieren (genehmigt), Endgültig löschen (immer).
  Genehmigen/Ablehnen stehen bewusst getrennt davon in einer eigenen Karte
  „Antrag entscheiden“ über Notiz und Details (Owner-Wunsch).
  Bearbeiten geht auch **rückwirkend** (etwa Urlaub → Krankheit); die
  Datenbank begrenzt das Datum nicht.
- Tabelle: die ganze Zeile öffnet die Detailseite, kein Menü „⋯“ mehr.
  Offene Zeilen haben Haken und Kreuz als reine Symbolknöpfe
  (`stopPropagation`, sonst öffnet der Klick die Zeile mit). Unter 640 px
  fallen Kalendertage und Knöpfe weg, und der Zeitraum bricht zwischen den
  Daten um — vorher überlappten sich die Spalten (Fluents `Table` hat feste
  Spaltenbreiten).
- Übersicht → Anträge: Haken (blau) und Kreuz (weiß) ohne Text, damit sie auf
  kleinen Laptops nicht in Name und Zeitraum drücken; Name und Zeitraum
  führen zur Detailseite.
- Abgelehnte zeigen ihren Grund unter dem Status und auf der Detailseite.
- `AbsenceActionDialog` ist die Rückfrage für Ablehnen (mit freiwilligem
  Grund), Stornieren und Löschen; `onDone` führt nach dem Löschen zurück zur
  Liste. Solange gelöscht wird (`DELETE_ABSENCE_KEY`), zeigt die Detailseite
  den Spinner statt „nicht gefunden“.
- `AbsenceSheet` mit `absence` bearbeitet; der Mitarbeiter ist dann gesperrt.

## Bekannt

- Die Handy-App kann seit bautakt-app `01b0344` auch bearbeiten und endgültig
  löschen, aber nur online (nicht über die Outbox). Im Web Gelöschtes
  verschwindet dort beim nächsten Abgleich, weil `syncAbsencesFromSupabase`
  den Cache komplett ersetzt.
