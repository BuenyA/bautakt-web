# Auftragsnotizen

Die Auftragsdetailseite zeigt die Notizen eines Auftrags und schreibt
dieselben Zeilen in `order_notes`, die die Handy-App synchronisiert. Anlegen,
Bearbeiten und Löschen sitzen im Notizen-Block. Fotos und der Auftrag selbst
bleiben davon unberührt.

## Was die Seite tut

`OrderNotes` steht unter der Stammdatenkarte auf `OrderDetailPage`, direkt
unter der Fotogalerie. Vier Zustände: Skelett beim Laden, Fehler mit „Erneut
versuchen“, leerer Hinweis, Liste der Notizkarten. Jede Karte ist eine weiche
Card (`rounded-xl`, `bg-card`, `shadow-sm`). Die Optik steht in
[webapp-shell.md](webapp-shell.md#detailflächen).

Jede Karte zeigt Titel und Text, soweit sie nicht leer sind, dazu den
Zeitstempel von `created_at` und den Namen aus `profiles`, wenn die Zeile über
`user_id` ein sichtbares Profil hat. Liegt `modified_at` später, steht daneben
„Geändert …“. Fehlt der Name, bleibt die Notiz sichtbar — nur ohne Autor.

Die Abfrage steckt in `useOrderNotes`: `order_notes`, gefiltert auf die
`company_id` der Mitgliedschaft und die `order_id`, sortiert nach `created_at`
absteigend. Der `queryKey` ist `['order-notes', companyId, orderId]`. Nach
dem Speichern oder Löschen wird `['order-notes', companyId]` invalidiert, die
offene Liste lädt neu.

Sortiert wird nach dem Schreibzeitpunkt, nicht nach `modified_at`. Der
auftragsspezifische Index heißt `order_notes_order_id_modified_at_idx` und
liegt auf `(order_id, modified_at DESC NULLS LAST, created_at DESC)`.
`modified_at` hat keinen Default und ist null, bis ein Client ihn setzt.
`NULLS LAST` würde eine Notiz ohne diesen Stempel hinter jede bereits
geänderte schieben. Beim Anlegen setzt die Webapp `created_at` und
`modified_at` auf denselben Augenblick, damit „Geändert …“ nicht sofort
erscheint. _Stand 2026-10-08: die vorhandenen Zeilen haben `modified_at`
jeweils nach `created_at`._

## Schreiben

Mit `canCreateNotes` steht „Notiz hinzufügen“ über der Liste und im leeren
Zustand. Der leere Hinweis heißt weiter „Noch keine Notizen“ und verweist
dann nicht mehr nur auf die Handy-App. Ohne das Recht bleibt der Hinweis auf
die App, und es gibt keinen Knopf.

Die Karte öffnet ein Seitenpanel (`OrderNoteSheet`), dasselbe Muster wie die
Zeiten. Felder sind Titel und Text. Nach dem Trim muss eines von beiden
Inhalt haben, sonst speichert das Formular nicht. Die Spalten nähmen den
leeren Text an; eine Notiz aus nur Leerzeichen wäre in der Liste unsichtbar,
weil die Anzeige trimmt. Eine Längengrenze gibt es in der Tabelle nicht, und
das Formular setzt keine.

Löschen sitzt im Panel und fragt vorher nach. Dialog und Panel bleiben offen,
bis die Zeile weg ist. Der Knopf zeigt „Wird gelöscht …“. Ein Fehler bleibt
im Dialog.

`id` hat kein Default. Der Client setzt `crypto.randomUUID()`. `user_id` ist
beim Anlegen der angemeldete Nutzer (`auth.uid()` über die Sitzung), nicht
eine wählbare Person. `created_at` und `modified_at` setzt der Client mit;
`modified_at` hat keinen Default.

Beim Bearbeiten gehen nur `title`, `body` und `modified_at` mit. Ungeschrieben
bleiben `user_id`, `created_at`, `company_id` und `order_id`. Ist der
getrimmte Text gleich dem gespeicherten, gibt es keinen Schreibzugriff —
sonst wanderte `modified_at` ohne sichtbare Änderung. Vor dem Anlegen prüft
der Client, dass der Auftrag in diesem Betrieb sichtbar ist.

## Recht

Knöpfe hängen an `canCreateNotes`. Das blendet sie aus und ist keine
Kontrolle. Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die
Berechtigung.“ (`readableDbError`, Postgres `42501`).

_Gemessen 2026-10-08, Policies auf `order_notes`:_

- Select „Members can view order notes“: Mitglied und (`canViewNotes` oder
  `canCreateNotes`).
- Insert „Members can insert order notes“, Update „Members can update order
  notes“, Delete „Members can delete order notes“: Mitglied und
  `canCreateNotes`. Kein Abgleich mit `user_id`.

Damit darf, wer Notizen anlegen darf, jede sichtbare Notiz bearbeiten und
löschen — die eigene und die fremde. `canManageOrders` allein reicht nicht.
Wer nur `canViewNotes` hat (Systemrolle Praktikant), sieht die Liste und
keinen Knopf. Wer keines von beiden hat (Systemrolle Buchhaltung), bekommt
keine Zeilen; die Oberfläche zeigt dann denselben leeren Hinweis wie bei
einem Auftrag ohne Notizen.

Das war nicht immer so. Bis zur Migration `permission_rls_enforcement`
(2026-08-09) galt für Update und Delete: eigene Zeile mit `canCreateNotes`,
oder `canManageEmployees`. Am 09.08. wurde das Verwaltungsrecht auf
`canManageOrders` gelegt. Die Migration `order_notes_shared_and_view_permission`
(2026-08-11) hat die Unterscheidung entfernt und Insert von
`user_id = auth.uid()` gelöst. Die Webapp folgt diesem Stand. Den Autor setzt
sie trotzdem auf den angemeldeten Nutzer und schickt ihn beim Bearbeiten
nicht mit — die Datenbank schützt ihn nicht mehr.

Policies stehen im Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/index.md>.

## Sync

Die Handy-App schreibt per `order_note.upsert` (`onConflict: id`,
`modified_at` gesetzt) und löscht per `order_note.delete`. Das ist
Last-Write-Wins aus dem Geräte-Cache. Die Webapp legt per Insert an und
ändert per schmalem Update, damit eine Korrektur am Schreibtisch den Autor
oder die Verknüpfung nicht umschreibt. Ein Gerät, das die alte Zeile noch im
Cache hat, kann die Änderung beim nächsten Push überschreiben. Das ist das
bestehende Sync-Modell; diese Seite fügt keine Spalte hinzu.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`order_notes` bereits. Diese Änderung hat das Schema nicht angefasst.
