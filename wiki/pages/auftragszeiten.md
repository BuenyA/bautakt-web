# Auftragszeiten

Die Auftragsdetailseite zeigt die Zeiteinträge zu diesem Auftrag. Die Webapp
liest sie dort und legt auf dieser Seite nichts an: kein Anlegen, kein
Bearbeiten, kein Löschen.

## Warum nur lesen

Die Webapp ist der Schreibtisch für Geschäftsführung und Buchhaltung. Zeiten
entstehen auf der Baustelle, in der Handy-App. Nachtragen für jemanden, der
nicht gestempelt hat, gibt es schon auf `/zeiten` (`TimeEntrySheet`, nur mit
`canTrackTimeForTeam`). Die Detailansicht braucht dieselbe Schreibstelle nicht
noch einmal.

## Was die Seite tut

`OrderTimes` steht unter der Stammdatenkarte auf `OrderDetailPage`, direkt
unter den Notizen. Vier Zustände: Skelett beim Laden, Fehler mit „Erneut
versuchen", leerer Hinweis („Noch keine Zeiten"), Liste der Einträge. Jede
Karte zeigt Mitarbeiter, Zeitraum, Pause, Nettodauer (ohne Ende: „Offen") und
die Notiz, soweit sie nicht leer ist. Neueste zuerst.

„Alle Zeiten“ führt auf `/zeiten?order=<id>`. Dieselbe Abfrage filtert die
Liste: `useTimeEntries(orderId)` setzt `order_id` nur, wenn die Route den
Parameter trägt (`timesOrderParam`, der Wert ist `order`). Ohne Parameter bleibt
die Betriebsliste. Leer und Fehler auf der gefilterten Liste bieten „Alle
Aufträge“; „Zum Auftrag“ führt zurück auf die Detailseite.

Die Abfrage steckt in `useTimeEntries`: `time_entries`, gefiltert auf die
`company_id` der Mitgliedschaft und — auf der Detailseite — die `order_id`,
sortiert nach `started_at` absteigend. Der `queryKey` ist
`['timeEntries', companyId, orderId ?? 'all']`. Das dritte Segment trennt die
Auftragsliste vom Cache der ungefilterten Liste.

Der Index `time_entries_order_id_started_at_idx` liegt auf
`(order_id, started_at DESC)` und trifft diese Sortierung. _Stand 2026-09-24._

## Grenze

_Stand 2026-09-24._ Lesen hängt an der Select-Policy „Members can view own or
managed time entries“: eigene Zeilen (`user_id` ist der angemeldete Nutzer und
`is_company_member`) oder eines von `canTrackTimeForTeam`,
`canViewCompanyFinance`, `canViewWageCosts`. Insert, Update und Delete heißen
„Members can … own or managed time entries“ und verlangen eigene Zeiterfassung
oder Team-Erfassung. `OrderTimes` ruft keines davon auf. Policies stehen im
Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/craft/blob/main/wiki/index.md>.

Ohne das weitere Leserecht sieht ein Mitglied nur die eigenen Zeilen. Die
Oberfläche zeigt dann denselben leeren Hinweis wie bei einem Auftrag ohne
Zeiten. Die Datenbank bleibt die Grenze; ein ausgeblendeter Block wäre keine
Kontrolle.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`time_entries` bereits (`started_at`, `ended_at`, `break_minutes`, `note`,
`order_id`, `employment_id` → `employments`, `user_id` → `profiles`). Diese
Änderung hat das Schema nicht angefasst.
