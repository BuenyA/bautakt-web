# Bautagebuch am Auftrag

Die Auftragsdetailseite zeigt die Tagesberichte eines Auftrags und legt sie
an, ändert sie und löscht sie. Die Zeile liegt in `daily_reports`, dieselbe
Tabelle, die die Handy-App liest und per Sync schreibt. Material buchen,
Fotos zuordnen, Mängel und ein PDF sind nicht dabei.

## Was die Seite zeigt

`OrderDailyReports` steht unter der Stammdatenkarte auf `OrderDetailPage`,
unter dem Material. Ohne `canCreateAndViewReports` fehlt der Block: die
Select-Policy liefert dann keine Zeile, und ein leerer Hinweis sähe aus wie
ein Auftrag ohne Bericht.

Vier Zustände, sobald der Block sichtbar ist: Skelett beim Laden, Fehler mit
„Erneut versuchen“, leerer Hinweis („Noch kein Bautagebuch“), Liste der
Berichte. Jede Karte ist eine weiche Card (`rounded-xl`, `bg-card`,
`shadow-sm`) und zeigt Datum, Wetter mit Temperatur, die Anwesenheit, die
Leistungen, die Notizen und den Namen aus `profiles`. Neueste Tage zuerst.
Die Optik steht in [webapp-shell.md](webapp-shell.md#detailflächen).

Wer den Bericht ändern darf, öffnet die Karte als Knopf das Panel. Wer ihn
nur lesen darf, sieht dieselbe Karte ohne Knopf. „Bericht anlegen“ steht in
der Überschrift und im leeren Zustand, sobald das Konto Berichte anlegen
darf — dasselbe Recht wie das Lesen.

Sichtbar verknüpfte Zeiten, Material, Fotos und Mängel stehen als Anzahl auf
der Karte, wenn die Zahl größer als 0 ist. Die Zeilen selbst werden hier
nicht geöffnet und nicht gebucht. Schlägt eine Zählung fehl, fehlt diese
Zahl, statt eine 0 zu behaupten.

Die Abfrage steckt in `useOrderDailyReports`: `daily_reports`, gefiltert auf
die `company_id` der Mitgliedschaft und die `order_id`, sortiert nach
`report_date` absteigend, danach `created_at`. Der `queryKey` ist
`['daily-reports', companyId, orderId]`. Nach dem Speichern und nach dem
Löschen wird `['daily-reports', companyId]` invalidiert, dazu die Zeiten und,
wenn ein Bericht fällt, Material und Fotos.

Der Index `daily_reports_order_id_report_date_created_idx` liegt auf
`(order_id, report_date DESC, created_at DESC)` und trifft diese Sortierung.
_Stand 2026-10-08._

Das Datum steht als `TT.MM.JJJJ` (`formatIsoDateDe`). Temperaturen mit
deutschem Komma und „°C“.

## Formular

Pflicht, wie in der Handy-App für diesen Kern: Datum, Wetter morgens und
nachmittags, beide Temperaturen, mindestens eine Anwesenheit, ausgeführte
Leistungen nicht leer. Notizen dürfen leer sein. Eine Längengrenze gibt es
nicht, und das Formular setzt keine.

Wetter ist freier Text. Gespeichert wird die deutsche Bezeichnung, nicht ein
Schlüssel. An Spahrbau stehen „Sonnig“, „Bewölkt“ und „Leicht bewölkt“
(gemessen 2026-10-08). Das Select bietet dieselben Lagen und die üblichen
weiteren; ein gespeicherter Wert außerhalb der Liste bleibt auswählbar, damit
ein Speichern ihn nicht leert.

`daily_reports.id` hat kein Default. Der Client setzt `crypto.randomUUID()`.
`modified_at` setzt der Client mit; die Spalte hat keinen. `user_id` ist beim
Anlegen der angemeldete Nutzer. Die Insert-Policy verlangt das.
`created_at` hat einen Default und geht nicht mit.

Beim Bearbeiten gehen Datum, beide Wetter, beide Temperaturen, Leistungen,
Notizen und `modified_at` mit. Ungeschrieben bleiben `materials`,
`special_occurrences`, `user_id`, `company_id`, `order_id` und `created_at`.
Ein zweiter Bericht am selben Tag scheitert am Unique-Index
`daily_reports_order_id_report_date_uidx`. Die Meldung sagt das, und wenn der
bestehende Bericht für dieses Konto lesbar und änderbar ist, öffnet ein Knopf
ihn.

## Anwesenheit und Zeit

Die Anwesenheit liegt in `daily_report_employees` (`report_id`,
`employment_id`). Speichern ersetzt die Menge: neue Zeilen zuerst, dann die
abgewählten. Das ist die Replace-Semantik des Syncs. Die Tabelle trägt keine
Uhrzeit.

Von und Bis erscheinen nur, wenn das Konto für diese Anstellung Zeit buchen
darf (`canTrackTimeForTeam` für jede, nur `canTrackTime` für die eigene).
Ohne eines von beiden gibt es keine Uhrzeit und es entsteht keine Zeile in
`time_entries`. Eine Anstellung ohne Konto bucht nur das Team-Recht.

Neue Berichtszeiten starten um 07:00 und enden um 16:00, Pause 0, Notiz leer,
`group_id` leer, `daily_report_id` gesetzt. `is_billable` ist wahr. Sätze
gehen nur mit `canManageRates` mit, sonst füllt der Trigger sie. Liegt das
Ende vor dem Beginn, ist das eine Nachtschicht, wie bei der Zeiterfassung.

Beim Ändern gehen nur `started_at`, `ended_at` und `modified_at` mit, und nur
wenn sich der Zeitraum geändert hat. Abgerechnete Zeiten
(`billed_document_id`) bleiben stehen; die Oberfläche liest die Spalte direkt
vor dem Schreiben noch einmal. Eine Person, die aus der Anwesenheit genommen
wird, verliert ihre nicht abgerechnete Berichtszeit. Eine Zeit, die am
Bericht hängt, aber nie in der Anwesenheit stand, bleibt.

Schlägt das Anlegen nach dem Insert fehl, wird der neue Bericht wieder
gelöscht. Sonst bliebe eine halbe Zeile stehen, die die Handy-App sieht.

## Löschen

Der Dialog nennt, dass Zeiten, Material, Fotos und Mängel des Berichts per
`ON DELETE CASCADE` mitfallen, auch Zeilen, die dieses Konto nicht sieht, und
auch abgerechnete Zeiten. RLS auf den vier Tabellen ist nicht `FORCE`
(gemessen 2026-10-08). Die Anzahlen sind das, was die Select-Policy zeigt;
fehlt eine Abfrage, fehlt die Zahl.

Der Knopf trägt „Wird gelöscht …“ und ist gesperrt, solange die Anfrage
läuft. Der Bericht verschwindet aus der Liste erst, wenn die Antwort eine
gelöschte `id` enthält. Eine von RLS verschluckte Löschung ist ein Fehler,
kein Erfolg.

Panel und Dialog bleiben offen, solange Speichern oder Löschen läuft.
`useDismissLock` lässt Fokus, Escape und einen Klick daneben in der Zeit
nicht durch. Der Dialog meldet `isPending` nach oben, damit das Panel
mitgesperrt ist. Das Sheet selbst ignoriert Fokus und Klicks, die auf einen
verschachtelten Dialog zielen; der Dialog liegt auf `z-[60]`.

## Recht

Knöpfe hängen an `canCreateDailyReport` und `canEditDailyReport`. Das blendet
sie aus und ist keine Kontrolle.

- `canCreateAndViewReports`: die Liste, anlegen, und ändern oder löschen, wo
  `user_id` der angemeldete Nutzer ist.
- `canManageOrders`: ändern und löschen für jede sichtbare Zeile. Anlegen
  bleibt an `canCreateAndViewReports`. Ohne das Leserecht ist die Liste leer,
  der Block fehlt.
- `canTrackTimeForTeam`: aus dem Bericht Zeiten für jede ausgewählte
  Anstellung.
- nur `canTrackTime`: eine Zeit nur für die eigene Anstellung. Die übrigen
  Personen stehen in der Anwesenheit, ohne Uhrzeit und ohne Schreibversuch.
- keines der beiden Zeitrechte: keine Uhrzeit, keine Zeitzeile.

_Stand 2026-10-08, Systemrollen Spahrbau:_ Geschäftsführung, Bauleitung und
Polier haben Bericht, Auftragsverwaltung und Team-Zeit. Mitarbeiter haben
Bericht und eigene Zeit, keine Team-Zeit und kein `canManageOrders`. Azubi,
Praktikant und Buchhaltung haben kein `canCreateAndViewReports` und sehen
den Block nicht.

Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die
Berechtigung.“ (`readableDbError`, Postgres `42501`). Policies stehen im
Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/index.md>.

## Sync

Die Handy-App schreibt per `daily_report.upsert` (Bericht plus Replace der
Anwesenheit) und löscht per `daily_report.delete`. Das ist Last-Write-Wins
aus dem Geräte-Cache. Die Webapp legt per Insert an und ändert per schmalem
Update, damit eine Korrektur am Schreibtisch Materialtext, besondere
Vorkommnisse oder den Autor nicht umschreibt. Ein Gerät, das die alte Zeile
noch im Cache hat, kann die Änderung beim nächsten Push überschreiben. Das
ist das bestehende Sync-Modell; diese Seite fügt keine Spalte hinzu.

_Stand 2026-10-08, Spahrbau: 4 Berichte, 11 Anwesenheiten, 10 Zeiten am
Bericht, 3 Materialien, 2 Fotos, 4 Mängel. Drei Berichte hängen am
Musterauftrag, einer am Testauftrag._

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`daily_reports` bereits. Diese Änderung hat das Schema nicht angefasst.
