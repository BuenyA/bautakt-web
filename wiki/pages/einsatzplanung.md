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
- Unter `sm` wären sieben Spalten zu schmal: dort eine Liste je Tag.

Abfrage: `useAssignments(from, to)` holt alles, was die Woche berührt
(`starts_at <= Ende`, `ends_at >= Beginn`), mit Profilbild-Pfad je Person. Die
Bilder signiert `useProfileImageUrls` in einem Rutsch. Der Kalender nutzt
denselben Hook für seinen sichtbaren Zeitraum.

## Einsatzseite

- Oben klein „Einsatz vom Di., 6. Oktober 2026 · 06:30–17:00“, darunter groß
  der Auftragsname (führt zum Auftrag) und die Adresse.
- Karte „Mitarbeiter (N)“: Kacheln mit 56-px-Bild und Namen. Mit
  `canManageEmployees` führt eine Kachel zur Mitarbeiterseite.
- Karte „Notizen“, Zeilenumbrüche bleiben.
- „Auf einen Blick“: Datum, Uhrzeit mit Dauer, angelegt am … von ….
  Den Namen liefert der Join `creator:profiles!created_by_user_id`. Kollegen
  derselben Firma dürfen das Profil lesen (gemessen 2026-10-11).
- „Zur Einsatzplanung“ öffnet die Woche des Einsatzes.

## Bearbeiten

Dasselbe Panel wie beim Anlegen (`AssignmentSheet` mit `assignment`).
`useUpdateAssignment`:

1. `update` auf `work_assignments` (Auftrag, Zeiten, Notiz, `modified_at`) mit
   `select('id')`. Null Zeilen heißt: kein Recht oder schon gelöscht.
2. Mitarbeiter als Differenz (`diffEmployees`): entfernte per `delete`, neue
   per `insert`. Nicht alles löschen und neu anlegen — der Insert-Trigger
   `notify_work_assignment_assigned` benachrichtigt jeden eingefügten
   Mitarbeiter.
3. Danach `['assignments', companyId]` invalidieren, auch nach einem Fehler.

Gemessen 2026-10-11 in einer zurückgerollten Transaktion als Geschäftsführer:
Update trifft eine Zeile, nach dem Tausch eines Mitarbeiters gibt es genau eine
neue Benachrichtigung (für den neu Eingeteilten), die Zuordnung stimmt.

Schon eingeteilte, inzwischen ausgeschiedene Mitarbeiter stehen im Panel mit
Vermerk „ausgeschieden“ und bleiben angehakt. Sonst fielen sie beim Speichern
stillschweigend heraus.

## Code

- `apps/webapp/src/features/assignments/pages/AssignmentsListPage.tsx`
- `apps/webapp/src/features/assignments/components/AssignmentWeekView.tsx`
- `apps/webapp/src/features/assignments/pages/AssignmentDetailPage.tsx`
- `apps/webapp/src/features/assignments/useUpdateAssignment.ts`
- `apps/webapp/src/features/assignments/assignmentDraft.ts` (+ Test)
- `apps/webapp/src/features/assignments/crew.ts`
