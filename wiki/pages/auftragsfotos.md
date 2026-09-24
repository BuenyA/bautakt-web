# Auftragsfotos

Die Auftragsdetailseite zeigt die Fotos, die die Handy-App zu einem Auftrag
aufnimmt. Die Webapp liest sie und schreibt nichts: kein Upload, kein Löschen,
kein Bearbeiten.

## Warum nur lesen

Die Webapp ist der Schreibtisch für Geschäftsführung und Buchhaltung. Aufnehmen
passiert auf der Baustelle, offline-fähig, in der Handy-App. Eine zweite
Schreibstelle hier würde dieselben Zeilen noch einmal erzeugen, ohne dass die
Detailansicht das braucht.

## Was die Seite tut

`OrderPhotos` steht unter der Stammdatenkarte auf `OrderDetailPage`. Vier
Zustände: Skelett beim Laden, Fehler mit „Erneut versuchen", leerer Hinweis,
Raster der Vorschaubilder. Ein Klick öffnet das Bild in einem Dialog.

Die Abfrage steckt in `useOrderImages`: `order_images`, gefiltert auf die
`company_id` der Mitgliedschaft und die `order_id`, sortiert nach `taken_at`
absteigend. Der `queryKey` ist `['order-images', companyId, orderId]`.

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

## Grenze

_Stand 2026-09-24._ Lesen hängt an der Betriebsmitgliedschaft, nicht an
`canTakePhotos`. Die Tabellen-Policy heißt „Members can view order images", die
Storage-Policy „Members can view order images in storage". Die Storage-Policy
prüft das erste Pfadsegment, das ist die `company_id`. Dieselben 8 Zeilen
passen alle auf `{companyId}/{orderId}/{imageId}.jpg`, keine davon ist eine
öffentliche URL. Policies stehen im Wiki von `bautakt-app` und werden hier nicht
kopiert:
<https://github.com/BuenyA/craft/blob/main/wiki/index.md>.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`order_images` bereits. Diese Änderung hat das Schema nicht angefasst.
