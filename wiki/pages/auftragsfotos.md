# Auftragsfotos

Die Auftragsdetailseite zeigt die Fotos eines Auftrags und schreibt dieselben
Zeilen in `order_images`, die die Handy-App synchronisiert. Die Datei liegt im
privaten Bucket `order-images`. Die Anzeige läuft weiter über signierte URLs.

## Was die Seite tut

`OrderPhotos` steht unter der Stammdatenkarte auf `OrderDetailPage`. Vier
Zustände: Skelett beim Laden, Fehler mit „Erneut versuchen“, leerer Hinweis,
Raster der Vorschaubilder. Ein Klick öffnet das Bild in einem Dialog. Die
Kacheln sind weiche Cards (`rounded-xl`, `bg-card`, `shadow-sm`); das Raster
bleibt zwei, drei oder vier Spalten. Die Optik steht in
[webapp-shell.md](webapp-shell.md#detailflächen).

Die Abfrage steckt in `useOrderImages`: `order_images`, gefiltert auf die
`company_id` der Mitgliedschaft und die `order_id`, sortiert nach `taken_at`
absteigend. Der `queryKey` ist `['order-images', companyId, orderId]`. Nach
dem Hochladen oder Löschen wird `['order-images', companyId]` invalidiert.
Der Upload legt die neue Kachel zusätzlich sofort in den Cache, sobald die
signierte URL da ist.

Der Bucket `order-images` ist privat. Die Anzeige-URL kommt von
`storage.from('order-images').createSignedUrl(storage_path, 3600)`.
`storage_path` hat die Form `{companyId}/{orderId}/{imageId}.jpg` und wird
unverändert signiert, nicht zu einer öffentlichen URL umgebaut. Die Query
hält die URLs 50 Minuten und holt sie dann neu, auch beim Zurückkehren ins
Fenster. Sonst bleiben abgelaufene Signaturen in einer offen gelassenen Seite
stehen, weil der globale `staleTime` 30 Sekunden beträgt und
`refetchOnWindowFocus` global aus ist.

Eine einzelne Datei, die sich nicht signieren lässt, fällt aus dem Raster. Erst
wenn keine der vorhandenen Zeilen eine URL bekommt, gilt die Galerie als
Fehler.

## Schreiben

Mit `canTakePhotos` steht „Fotos hochladen“ über dem Raster und eine
Ablegefläche darunter. Mehrere Dateien auf einmal sind möglich. JPEG, PNG,
WebP und HEIC — soweit der Browser die Datei zeichnen kann — werden vor dem
Hochladen zu JPEG. HEIC scheitert in Browsern ohne Dekoder; die Meldung bittet
dann um JPEG oder PNG.

`id` hat kein Default. Der Client setzt `crypto.randomUUID()`. `user_id` ist
der angemeldete Nutzer. `storage_path` ist
`{companyId}/{orderId}/{imageId}.jpg`. `width` und `height` sind die Maße des
gespeicherten JPEG, nach der Drehung aus den EXIF-Daten und nach dem
Verkleinern. `taken_at` kommt aus EXIF `DateTimeOriginal`, sonst aus der
Datei-Zeit, sonst aus jetzt. Liegt ein `OffsetTimeOriginal` daneben, gilt der.
Ohne Offset gilt die Ortszeit des Browsers. `created_at` und `modified_at`
setzt der Client auf denselben Augenblick. `daily_report_id` bleibt leer —
das Bautagebuch hängt die Handy-App an, diese Seite nicht.

Größere Bilder werden auf 1920 Pixel Breite gebracht, schmalere nicht
hochskaliert. _Stand 2026-10-08: alle 10 Zeilen in `order_images` haben
`width = 1920` und sind höher als breit._ Die Handy-App war aus dieser
Umgebung nicht lesbar; die 1920 ist die gemessene Breite, nicht ein kopierter
Aufruf von `ImageManipulator`. Der Bucket nimmt nur `image/jpeg` und höchstens
5242880 Bytes. Die Qualität startet bei 0,85 und sinkt, danach die Kanten,
bis die Datei durchpasst.

Reihenfolge beim Anlegen: zuerst das Objekt, dann die Zeile. Schlägt das
Insert fehl, wird das Objekt wieder entfernt. Sonst bleibt eine Datei ohne
Zeile, und die Handy-App zeigt sie nicht. Gelingt das Aufräumen nicht, bleibt
das Objekt liegen; der Nutzer sieht einen Fehler, ein neuer Versuch verwendet
eine neue `id`.

Löschen fragt nach. Die Zeile wird vorher gelesen, der Pfad kommt aus
`storage_path`, nicht aus der Oberfläche. Dann das Storage-Objekt. „Nicht
gefunden“ zählt als Erfolg. Danach prüft ein HEAD (`exists`), ob die Datei
wirklich weg ist. Erst dann fällt die Zeile. Das ist dieselbe
Reihenfolge wie `order_image.delete` in der Handy-App: ein zweiter Versuch
nach einer unterbrochenen Löschung trifft die fehlende Datei und entfernt
dann die Zeile. Die Galerie lädt erst neu, wenn die Zeile weg ist.

Die Gegenprobe mit HEAD ist nötig, weil ein verweigertes Storage-Delete
nicht zuverlässig als Fehler zurückkommt: die Policy filtert die Zeile aus
der Antwort, das Objekt bleibt. Würde man dann die Tabellenzeile löschen,
wäre der Pfad weg und niemand räumt die Datei mehr auf. Ein `canManageOrders`
darf fremde Dateien löschen; die Policy lässt das zu, die Gegenprobe sieht
die Datei danach nicht mehr.

## Recht

Hochladen nur mit `canTakePhotos`. Löschen eigener Fotos mit `canTakePhotos`,
Löschen jedes Fotos mit `canManageOrders`. Die Knöpfe hängen daran. Das
blendet sie aus und ist keine Kontrolle. Lehnt die Datenbank ab, zeigt der
Dialog „Dafür fehlt dir die Berechtigung.“ (`readableDbError`, Postgres
`42501`).

_Gemessen 2026-10-08. Die Policies selbst stehen im Wiki von `bautakt-app`
und werden hier nicht kopiert:_
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/index.md>.

- Select „Members can view order images“: Mitgliedschaft, kein
  `canTakePhotos`.
- Insert „Members can insert own order images“: `user_id = auth.uid()`,
  Mitglied, `canTakePhotos`.
- Delete „Members can delete own or managed order images“: eigene Zeile und
  `canTakePhotos`, oder `canManageOrders`.
- Storage-Upload „Members can upload order images to storage“: Bucket
  `order-images`, erstes Pfadsegment ist die `company_id`, Mitglied,
  `canTakePhotos`.
- Storage-Delete „Members can delete own or managed order images in storage“:
  `owner_id = auth.uid()` und `canTakePhotos`, oder `canManageOrders`.

_Gemessen 2026-10-08 an `system_role_templates`:_ Praktikant, Azubi und
Mitarbeiter haben `canTakePhotos` und nicht `canManageOrders` — hochladen und
nur eigene Fotos löschen. Polier, Bauleiter und Geschäftsführer haben beides
und löschen jedes Foto. Buchhaltung hat keines von beiden, sieht die Galerie
und keinen Knopf.

Der Bucket ist nicht öffentlich. `allowed_mime_types` ist nur `image/jpeg`,
`file_size_limit` ist 5242880. _Stand 2026-10-08: die zehn Zeilen zeigen auf
ein JPEG, `owner_id` der Datei ist `user_id` der Zeile, der Pfad passt auf
`{companyId}/{orderId}/{imageId}.jpg`._ Im Bucket lagen daneben 39 weitere
Objekte ohne Zeile. Die entstehen, wenn ein Auftrag gelöscht wird:
`order_images.order_id` hängt mit `ON DELETE CASCADE`, die Datei im Bucket
nicht. Diese Seite löscht keine Aufträge und räumt die alten Objekte nicht
auf. Siehe [fallstricke.md](fallstricke.md).

## Sync

Die Handy-App schreibt per `order_image.upsert` (erst Storage, dann Zeile,
`onConflict: id`) und löscht per `order_image.delete` (erst Storage, „Object
not found“ toleriert, dann Zeile). Das ist Last-Write-Wins aus dem
Geräte-Cache. Die Webapp legt per Insert an, mit einer neuen `id`, und
ändert keine fremde Zeile. Ein Gerät, das dasselbe Foto noch im Cache hat,
kann die Zeile beim nächsten Push wieder anlegen. Das ist das bestehende
Sync-Modell; diese Seite fügt keine Spalte hinzu.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`order_images` bereits. Diese Änderung hat das Schema nicht angefasst.
