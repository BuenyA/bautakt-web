# Einsatzplanung: Wochenplan und Einsatzseite

`/einsatzplanung` zeigt seit 2026-10-11 einen Wochenplan statt einer Tabelle.
`/einsatzplanung/:id` ist eine Einsatzseite mit Auftrag, Mitarbeitern und
Notizen. Einsätze lassen sich dort bearbeiten. Anlegen und Löschen:
[einsatz-anlegen.md](einsatz-anlegen.md).

## Wochenplan

- Zeitraster 0–24 Uhr wie die Woche im Kalender, beim Öffnen auf 7 Uhr
  gescrollt. Stundenspalte, Kopf, Stundenfelder und Jetzt-Linie teilen sich
  beide Ansichten (`features/calendar/components/timeGrid.tsx`,
  `timeGridLayout.ts`).
- Die Woche steht in der URL: `?woche=2026-10-05` (Montag). Die aktuelle Woche
  hat keinen Parameter.
- Je Einsatz ein blauer Block mit Auftrag, Uhrzeit und den Gesichtern der
  Eingeteilten (Profilbild, sonst Initialen). Erst fällt bei kurzen Blöcken die
  Uhrzeit weg, dann die Gesichter. Ohne Mitarbeiter steht dort „Niemand
  eingeteilt“ in Gelb.
- Der Kopf des Blocks klebt oben im sichtbaren Bereich (`sticky`). Damit das
  geht, schneidet der Block mit `overflow-clip` statt `overflow-hidden` ab —
  `hidden` macht ihn zum Scrollcontainer, und `sticky` greift dann nicht mehr.
- Über Mitternacht oder mehrere Tage steht der Einsatz an jedem Tag, die
  Uhrzeit dann mit Wochentag („Mi 20:00 – Do 04:00“).
- Klick in eine leere Stunde legt dort einen Einsatz an (eine Stunde lang),
  nur mit `canManageWorkAssignments`. Danach bleibt man im Wochenplan. Der
  Knopf „Einsatz anlegen“ oben führt nach dem Speichern weiter zum Einsatz.
- Eine leere Woche zeigt nur das leere Raster, ohne Hinweistext.
- Unter `sm` wären sieben Spalten zu schmal: dort eine Liste je Tag.

Abfrage: `useAssignments(from, to)` holt alles, was die Woche berührt
(`starts_at <= Ende`, `ends_at >= Beginn`), mit Profilbild-Pfad je Person. Die
Bilder signiert `useProfileImageUrls` in einem Rutsch. Der Kalender nutzt
denselben Hook für seinen sichtbaren Zeitraum.

## Einsatzseite

- Oben klein der Auftragsname (führt zum Auftrag), darunter groß „Einsatz vom
  Di., 6. Oktober 2026 · 06:30–17:00“ und die Adresse. Auf dieser Seite geht es
  um den Termin, der Auftrag ist Kontext (Owner-Vorgabe 2026-10-11). Einen
  eigenen Knopf „Zum Auftrag“ gibt es deshalb nicht.
- Karte „Mitarbeiter (N)“: Kacheln mit 56-px-Bild und Namen. Mit
  `canManageEmployees` führt eine Kachel zur Mitarbeiterseite.
- Karte „Notizen“, Zeilenumbrüche bleiben.
- „Auf einen Blick“: Datum, Uhrzeit mit Dauer, angelegt am … von ….
  Den Namen liefert der Join `creator:profiles!created_by_user_id`. Kollegen
  derselben Firma dürfen das Profil lesen (gemessen 2026-10-11).
- „Zurück“ öffnet die Woche des Einsatzes, nicht die aktuelle.

## Bearbeiten

Dasselbe Panel wie beim Anlegen (`AssignmentSheet` mit `assignment`).
`useUpdateAssignment`:

1. Entfernte Mitarbeiter austragen (`delete`, aus `diffEmployees`). Zuerst,
   weil die Datenbank das Verschieben in eine genehmigte Abwesenheit eines
   Eingeteilten sperrt; wer gerade rausfliegt, darf nicht mehr mitzählen.
2. `update` auf `work_assignments` (Auftrag, Zeiten, Notiz, `modified_at`) mit
   `select('id')`. Null Zeilen heißt: kein Recht oder schon gelöscht.
3. Neue Mitarbeiter per `insert`. Nicht alles löschen und neu anlegen — der
   Insert-Trigger `notify_work_assignment_assigned` benachrichtigt jeden
   eingefügten Mitarbeiter, und die Abwesenheitssperre würde den ganzen
   Insert abweisen.
4. Danach `['assignments', companyId]` invalidieren, auch nach einem Fehler.

Gemessen 2026-10-11 in einer zurückgerollten Transaktion als Geschäftsführer:
Update trifft eine Zeile, nach dem Tausch eines Mitarbeiters gibt es genau eine
neue Benachrichtigung (für den neu Eingeteilten), die Zuordnung stimmt.

Schon eingeteilte, inzwischen ausgeschiedene Mitarbeiter stehen im Panel mit
Vermerk „ausgeschieden“ und bleiben angehakt. Sonst fielen sie beim Speichern
stillschweigend heraus.

## Abwesenheit sperrt Einteilen

Seit 2026-10-11 (Migration `20261011211438_work_assignment_absence_conflict`
in bautakt-app) prüft die Datenbank beide Richtungen:

- **Abwesenheit genehmigen**, obwohl ein Einsatz liegt →
  `ABSENCE_WORK_ASSIGNMENT_CONFLICT` (gab es schon).
- **Einteilen** bei genehmigter Abwesenheit (Insert in
  `work_assignment_employees`) → `WORK_ASSIGNMENT_ABSENCE_CONFLICT`. Gilt für
  jede Abwesenheitsart.
- **Verschieben** eines Einsatzes in die genehmigte Abwesenheit eines
  Eingeteilten → derselbe Code. Nur neue Konflikte: Altfälle (eingeteilt,
  bevor es die Sperre gab) lassen sich weiter verschieben und bearbeiten.
- Offene Anträge (`ausstehend`) sperren nicht, nur Hinweis (Owner-Entscheidung).
- Verglichen werden Kalendertage in `Europe/Berlin`. Vorher nahm der
  Absence-Trigger den UTC-Tag.

Anlass: am 2026-10-11 wurde der Owner um 21:07 per „Bearbeiten“ in einen
Einsatz eingeteilt, für den er um 21:06 Urlaub genehmigt hatte.

Oberfläche (`absenceConflict.ts`, getestet):

- Panel: genehmigt Abwesende sind ausgegraut und nicht wählbar
  („Krankheit 10.10. – 14.10.“). Schon Eingeteilte bleiben angehakt, rot mit
  „bitte austragen“. Beantragt: gelber Vermerk, wählbar.
- Einsatzseite: rote Kachel „Urlaub (genehmigt)“ bei Altfällen.
- Kalender: eigener privater Termin an einem eigenen Abwesenheitstag zeigt
  einen Hinweis, Speichern geht (Owner-Entscheidung: Termine nur Hinweis).
- ⚠️ Ohne `canManageAbsences` liefert RLS nur die eigenen Abwesenheiten; das
  Panel markiert dann fremde nicht. Die Sperre greift trotzdem, die Meldung
  kommt beim Speichern (`dbErrors.ts`).

## Code

- `apps/webapp/src/features/assignments/pages/AssignmentsListPage.tsx`
- `apps/webapp/src/features/assignments/components/AssignmentWeekView.tsx`
- `apps/webapp/src/features/assignments/pages/AssignmentDetailPage.tsx`
- `apps/webapp/src/features/assignments/useUpdateAssignment.ts`
- `apps/webapp/src/features/assignments/assignmentDraft.ts` (+ Test)
- `apps/webapp/src/features/assignments/crew.ts`
