# Auftragszeiten

Die Auftragsdetailseite zeigt die Zeiteinträge zu diesem Auftrag und legt sie
dort an, ändert sie und löscht sie. Dieselbe Schreibstelle liegt auf `/zeiten`.
Beide öffnen `TimeEntrySheet`. Die Zeile liegt in `time_entries`, derselben
Tabelle, die die Handy-App liest und per Sync schreibt.

## Was die Seite zeigt

`OrderTimes` steht unter der Stammdatenkarte auf `OrderDetailPage`, direkt
unter den Notizen. Vier Zustände: Skelett beim Laden, Fehler mit „Erneut
versuchen", leerer Hinweis („Noch keine Zeiten"), Liste der Einträge. Jede
Karte zeigt Mitarbeiter, Zeitraum, Pause, Nettodauer (ohne Ende: „Offen") und
die Notiz, soweit sie nicht leer ist, und ist eine weiche Card (`rounded-xl`,
`bg-card`, `shadow-sm`). Ein abgerechneter Eintrag trägt zusätzlich „Abgerechnet“.
Neueste zuerst. Die Optik steht in [webapp-shell.md](webapp-shell.md#detailflächen).

Wer den Eintrag ändern darf, öffnet die Karte als Knopf das Panel. Wer ihn nur
lesen darf, sieht dieselbe Karte ohne Knopf. „Zeit nachtragen“ steht in der
Überschrift und im leeren Zustand, sobald das Konto eigene Zeit oder Team-Zeit
erfassen darf.

„Alle Zeiten“ führt auf `/zeiten?order=<id>`. Dieselbe Abfrage filtert die
Liste: `useTimeEntries(orderId)` setzt `order_id` nur, wenn die Route den
Parameter trägt (`timesOrderParam`, der Wert ist `order`). Ohne Parameter bleibt
die Betriebsliste. Leer und Fehler auf der gefilterten Liste bieten „Alle
Aufträge“; „Zum Auftrag“ führt zurück auf die Detailseite. Die Liste öffnet
eine Zeile ins selbe Panel, wenn das Konto sie ändern darf, und kennzeichnet
abgerechnete Zeilen.

Die Abfrage steckt in `useTimeEntries`: `time_entries`, gefiltert auf die
`company_id` der Mitgliedschaft und — auf der Detailseite — die `order_id`,
sortiert nach `started_at` absteigend. Der `queryKey` ist
`['timeEntries', companyId, orderId ?? 'all']`. Das dritte Segment trennt die
Auftragsliste vom Cache der ungefilterten Liste. Nach dem Speichern und nach
dem Löschen wird `['timeEntries', companyId]` invalidiert, dazu die
Beleg-Caches `sales-documents` und `sales-document`.

Der Index `time_entries_order_id_started_at_idx` liegt auf
`(order_id, started_at DESC)` und trifft diese Sortierung. _Stand 2026-09-24._

## Formular

Pflicht, wie in der Handy-App: Auftrag, Datum, Beginn, Ende, und mindestens
eine Person. Die Pause ist eine ganze Zahl ab 0 und kürzer als die Bruttodauer.
Leer zählt als 0. Liegt das Ende vor dem Beginn oder auf derselben Minute, ist
das eine Nachtschicht: das Ende liegt 24 Stunden später. Der Check
`ended_at > started_at` (gemessen 2026-10-08) lässt den Gleichstand nicht
durch; die verschobene Stunde erfüllt ihn. Ein Eintrag ohne Ende bleibt der
Stoppuhr vorbehalten und entsteht hier nicht.

Mit `canTrackTimeForTeam` wählt man beim Anlegen mehrere aktive Mitarbeiter.
Ab zwei Personen teilen sich die Zeilen eine `group_id`. Schlägt eine Zeile
fehl, werden die schon geschriebenen gelöscht. Beim Bearbeiten gilt die
Änderung für genau diese Zeile; `group_id` bleibt. Ohne Team-Recht ist die
Person die eigene Anstellung, beim Anlegen erzwungen, beim Bearbeiten die
Anstellung der Zeile, solange sie gesetzt ist.

`time_entries.id` hat kein Default. Der Client setzt `crypto.randomUUID()`.
`modified_at` setzt der Client mit; die Spalte hat keinen Default.
`user_id` ist der Nutzer der gewählten Anstellung, nicht pauschal der
angemeldete. Eine Anstellung ohne Konto bleibt `user_id` null — das darf das
Team-Recht, die eigene Erfassung nicht.

Beim Bearbeiten gehen `order_id`, `employment_id`, `user_id`, `started_at`,
`ended_at`, `break_minutes`, `note` und `modified_at` mit. Ungeschrieben
bleiben `group_id`, `work_assignment_id`, `daily_report_id`, `cost_rate`,
`billing_rate`, `is_billable` und `billed_document_id`. Vom Auftragsdetail aus
ist der Auftrag gesperrt, auf `/zeiten` nicht. Eine Einsatz-Verknüpfung legt
dieses Formular nicht an.

## Sätze

`cost_rate` und `billing_rate` sind der Snapshot für die Rechnung. Der Trigger
`trg_time_entries_billing_fields` füllt sie beim INSERT nur, wenn das Konto
**kein** `canManageRates` hat (gemessen 2026-10-08). Mit dem Recht bleibt, was
der Client schickt — auch NULL, und dann hat der Rechnungsentwurf keinen Preis.

`resolve_labor_rate` ist für `authenticated` nicht ausführbar. Sie ist
`SECURITY DEFINER` und prüft die Mitgliedschaft nicht; ein Grant wäre das
bekannte mandantenübergreifende Leck. Der Client liest `labor_rates` (die
Select-Policy lässt `canManageRates`, `canViewWageCosts` und
`canUseBillingModule`) und spiegelt die Kaskade: Auftrag, Anstellung, Rolle,
Betrieb, unter den gültigen Sätzen der jüngste. Gültig heißt
`valid_from <= Tag` und `valid_to` leer oder später als der Tag. Trifft nichts,
gehen 0 und 0 mit, nie NULL. Der Tag ist das Datum aus dem Formular.

Ohne `canManageRates` schickt der Client keine Sätze. Der Trigger überschreibt
sie beim INSERT und hält sie beim UPDATE auf dem alten Wert. Seine Datumsgrenze
ist `started_at::date` in UTC (Zeitzone der Datenbank, gemessen 2026-10-08).
Um lokale Mitternacht kann das einen Tag neben dem Formulardatum liegen. Wer
Sätze verwaltet, bekommt den Formulartag.

## Abgerechnet

Ein Eintrag mit `billed_document_id` lässt sich hier nicht ändern und nicht
löschen. Das Panel zeigt den Hinweis und keinen Speichern-Knopf. Die Datenbank
sperrt das nicht: der Trigger hält `billed_document_id` nur für Konten ohne
`canUseBillingModule` fest. Die Oberfläche prüft die Spalte noch einmal direkt
vor dem Schreiben. Zwischen den beiden Abfragen kann ein Beleg festgeschrieben
werden; dann schützt nur noch der Trigger für Konten ohne Abrechnungsrecht.
Eine Sperre in der Datenbank wäre eine Migration in `bautakt-app` und ist hier
nicht angewendet.

Zeilen auf einem Rechnungs**entwurf** (`sales_document_lines.source_type =
'time_entry'`, Beleg noch `draft`) setzen `billed_document_id` nicht. Der
Entwurf ist eine Kopie (Menge, Preis, Text), kein Live-Blick auf die Zeit.
Ändern oder Löschen der Zeit schreibt die Position nicht um — die Summen am
Beleg hängen an den Positionen, und ein stilles Nachziehen würde sie
auseinanderlaufen lassen. Der nächste Entwurf, der die Zeiten neu liest, sieht
die Zeile mit gesetztem Satz. `finalize_sales_document` setzt
`billed_document_id` erst beim Festschreiben.

## Recht

Knöpfe hängen an `canCreateTimeEntry` und `canEditTimeEntry`. Das blendet sie
aus und ist keine Kontrolle.

- `canTrackTimeForTeam`: anlegen, bearbeiten und löschen für jede Zeile des
  Betriebs, beim Anlegen auch für mehrere Personen.
- nur `canTrackTime`: anlegen auf der eigenen Anstellung, bearbeiten und
  löschen nur, wo `user_id` der angemeldete Nutzer ist.
- keines von beiden: keine Schreib-Knöpfe. Lesen kann weiter über
  `canViewCompanyFinance` oder `canViewWageCosts` laufen; die Zeile lässt sich
  dann nicht öffnen.

Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die Berechtigung.“
(`readableDbError`, Postgres `42501`). Policies stehen im Wiki von
`bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/craft/blob/main/wiki/index.md>.

Ohne das weitere Leserecht sieht ein Mitglied nur die eigenen Zeilen. Die
Oberfläche zeigt dann denselben leeren Hinweis wie bei einem Auftrag ohne
Zeiten.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`time_entries` bereits. Diese Änderung hat das Schema nicht angefasst.
