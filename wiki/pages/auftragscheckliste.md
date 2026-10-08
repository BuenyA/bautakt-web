# Checkliste am Auftrag

Die Auftragsdetailseite zeigt die Checkliste eines Auftrags und legt Punkte
an, hakt sie ab, benennt sie um und löscht sie. Dieselben Zeilen in
`checklists` und `checklist_items` liest die Handy-App. Persönliche Listen
(`order_id` null) und eine zweite Liste am selben Auftrag sind nicht dabei.

## Was die Seite zeigt

`OrderChecklist` steht unter der Stammdatenkarte auf `OrderDetailPage`,
unter den Notizen und über den Zeiten. Vier Zustände, sobald der Block
sichtbar ist: Skelett beim Laden, Fehler mit „Erneut versuchen“, leerer
Hinweis („Noch keine Punkte“), Liste der Punkte. Jede Zeile ist eine weiche
Card (`rounded-xl`, `bg-card`, `shadow-sm`) mit Kästchen, Titel, Fälligkeit
und zugewiesener Person. Erledigte Titel sind durchgestrichen. Ein überfälliges
Datum (`due_date` vor dem lokalen heutigen Tag, Punkt offen) steht in
`text-destructive`. Die Optik steht in [webapp-shell.md](webapp-shell.md#detailflächen).

Darüber steht „2 von 3 erledigt“. Sortiert wird nach `position`, danach
`created_at`. Der Index `checklist_items_checklist_id_position_idx` liegt auf
`(checklist_id, position)`. _Stand 2026-10-08._

Wer `canEditChecklist` hat, öffnet die Zeile als Knopf das Panel. Das Kästchen
kippt sofort im Query-Cache (`onMutate`) und speichert danach. Schlägt das
Schreiben fehl, geht nur dieser Punkt auf den vorigen Stand zurück und eine
Meldung erscheint. Mehrere Klicks hintereinander schreiben nacheinander, jeder
auf einem frisch gelesenen Stand — sonst überschriebe das zweite Abhaken die
Liste vom ersten. Wer nur lesen darf, sieht dieselbe Zeile, das Kästchen ist
deaktiviert, es gibt keinen Knopf „Punkt hinzufügen“.

Die Abfrage steckt in `useOrderChecklist`. Der `queryKey` ist
`['order-checklist', companyId, orderId]`. Invalidiert wird
`['order-checklist', companyId]`, sobald keine Checklisten-Mutation mehr
offen ist. Löschen nimmt den Punkt erst danach aus dem Cache, wenn der
Server die Liste ohne ihn bestätigt hat.

## Eine Liste pro Auftrag

Pro Auftrag genau eine Liste, und die entsteht erst mit dem ersten Punkt.
Vorher gibt es keine Zeile in `checklists`. Gibt es schon eine, wird sie
wiederverwendet — die älteste nach `created_at`. Einen Unique-Constraint auf
`order_id` gibt es nicht (gemessen 2026-10-08). Liegen zwei Listen am selben
Auftrag, zeigt die Seite nur die ältere und löscht die andere nicht.

Beim Löschen des letzten Punkts bleibt der Parent stehen. Die Handy-App hat
seine Id im Cache. Eine neue leere Liste daneben wäre die zweite.

_Stand 2026-10-08, Spahrbau: 5 Checklisten, davon 2 an Aufträgen
(Musterauftrag, Testauftrag), zusammen 13 Punkte. Kein Auftrag mit zwei
Listen. Die Auftragslisten haben einen leeren `title`._

## Formular

Pflicht ist der Titel, nach dem Trim nicht leer. Die Spalte nähme `''` an;
ein Punkt aus nur Leerzeichen wäre in der Liste unsichtbar. Eine Längengrenze
gibt es nicht, und das Formular setzt keine.

Fälligkeit ist ein Datum oder leer. Leer wird `due_date` NULL. Angezeigt wird
der Kalendertag aus `YYYY-MM-DD`, nicht über `new Date(iso)` — das wäre UTC
und kann den Tag verschieben. `2026-02-31` gilt nicht; Postgres lehnt ihn
genauso ab.

Zuweisung ist eine aktive Beschäftigung oder niemand. Wer schon zugewiesen
ist und inzwischen ausgeschieden ist (`ended_at`), bleibt in der Auswahl
stehen, damit ein Speichern ohne Wechsel die Zuweisung nicht löscht. Eine
neue Zuweisung an jemanden mit `ended_at` lehnt der Client ab. Die Auswahl
öffnet nach oben (`side="top"`, `align="start"`, `collisionPadding` unten
120px), der Knopf „Punkt löschen“ sitzt in der Fußleiste. Sonst deckt die
Liste bei 1280×800 den Knopf ab.

## Was geschrieben wird

`checklists.id` und `checklist_items.id` haben kein Default. Der Client setzt
`crypto.randomUUID()`. `modified_at` hat keinen Default; der Client setzt ihn.

Parent, nur beim ersten Punkt:

`id`, `company_id`, `order_id`, `user_id` (angemeldeter Nutzer), `title`
(`''`), `created_at`, `modified_at`.

Parent, bei jeder späteren Änderung der Liste: nur `modified_at`. Nie
`title`, `user_id`, `created_at`, `company_id`, `order_id`. Der Titel der
Liste steht nicht im Formular. Die vorhandenen Auftragslisten sind leer; ein
Upsert der ganzen Parent-Zeile würde einen gesetzten Titel löschen.

Punkt, Upsert der kompletten Liste (`onConflict: id`):

`id`, `company_id`, `checklist_id`, `title`, `is_done`, `position`,
`due_date`, `assigned_employment_id`, `done_at`, `created_at`,
`modified_at`.

Weitere Spalten hat die Tabelle nicht. `position` bestehender Punkte bleibt.
Ein neuer Punkt hängt an (`max(position) + 1`). Löschen nummeriert nicht neu.
Abhaken setzt `is_done` und `done_at`, Aufheben setzt `is_done` falsch und
`done_at` NULL. Titel, Datum und Zuweisung lassen `is_done` und `done_at`
stehen. `modified_at` wandert nur an dem Punkt, der sich geändert hat; die
anderen gehen mit ihrem alten Stempel mit.

Danach löscht ein Delete jede Item-Id dieser Liste, die in der gespeicherten
Liste fehlt. Zuerst der Upsert, dann das Delete: bricht es nach dem Upsert
ab, fehlen höchstens die Löschungen, die der nächste Versuch nachholt. Die
Endlage ist dieselbe wie `checklist.upsert` in der Handy-App.

Ist der getrimmte Inhalt gleich dem gespeicherten, gibt es keinen
Schreibzugriff.

Löschen wartet auf diese Schreibfolge. Der Bestätigungsdialog und das Panel
bleiben offen, der Knopf zeigt „Wird gelöscht …“. Erst die bestätigte Liste
ohne den Punkt nimmt ihn aus der Anzeige. Ein Fehler bleibt im Dialog, der
Punkt bleibt. Das Panel schließt nicht, weil der Dialog den Fokus bekommt
oder weil jemand während der Anfrage außerhalb klickt.

## Recht

Knöpfe und das Kästchen hängen an `canEditChecklist`. Der Block selbst hängt
an `canViewChecklist` oder `canEditChecklist`. Das blendet ihn aus und ist
keine Kontrolle. Fehlen beide Rechte, ist der Block nicht da — nicht der
leere Hinweis.

_Gemessen 2026-10-08 an den Policies:_

- Lesen von Auftragsliste und Punkten: Mitglied und (`canViewChecklist` oder
  `canEditChecklist`). Kein Abgleich mit `user_id`.
- Anlegen, Ändern, Löschen: `canEditChecklist`. Ebenfalls ohne
  Eigentümer-Bedingung.
- Persönliche Listen (`order_id` null) hängen am eigenen `user_id`. Diese
  Seite filtert auf die `order_id` des Auftrags und schreibt dort nie NULL.

Unter den Systemrollen sieht der Praktikant die Liste und schreibt nicht.
Buchhaltung sieht den Block nicht. Geschäftsführung, Bauleiter, Polier,
Mitarbeiter und Azubi lesen und schreiben. _Stand 2026-10-08, Templates und
die Rollen von Spahrbau._

Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die
Berechtigung.“ (`readableDbError`, Postgres `42501`). Policies stehen im
Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/index.md>.

## Sync

Die Handy-App schreibt per `checklist.upsert` die ganze Liste (Parent plus
alle Punkte, fehlende Ids werden gelöscht) und löscht eine Liste per
`checklist.delete`. Das ist Last-Write-Wins aus dem Geräte-Cache. Die Webapp
macht für die Punkte dasselbe, den Parent aber nur als `modified_at` bzw.
beim Anlegen als Insert. Siehe oben.

Vor dem Schreiben liest die Webapp die Liste neu und wendet eine Änderung
darauf an. Ein Punkt, der den Server schon erreicht hat, bleibt erhalten.
Ein Punkt, den die Handy-App offline angelegt hat und noch nicht
hochgeladen hat, ist in diesem Lesevorgang nicht dabei. Der nächste Push
der kompletten Liste von dort löscht ihn, wenn er in dem Cache fehlt — und
ein Speichern im Web löscht umgekehrt Punkte, die nur auf dem Gerät liegen.
Zwei gleichzeitige Offline-Bearbeitungen derselben Liste können sich
gegenseitig Punkte löschen. Das ist die Folge der Ganzlisten-Speicherung,
nicht ein zweiter Sync-Weg.

`notify_checklist_item_assigned` läuft in der Datenbank bei Insert und bei
Änderung von `assigned_employment_id`. Die Webapp schickt keinen Push. Der
Trigger lässt aus, wenn niemand zugewiesen ist, der Punkt schon erledigt
ist, die Zuweisung gleich geblieben ist, die Beschäftigung beendet ist oder
die Person der angemeldete Nutzer ist. Ein Upsert, der dieselbe Zuweisung
noch einmal schreibt, löst deshalb keine zweite Meldung aus.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
beide Tabellen bereits. Diese Änderung hat das Schema nicht angefasst.
