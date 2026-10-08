# 2026-10-08 — Fotos am Auftrag hochladen und löschen

Auf dem Auftragsdetail lassen sich Fotos hochladen und löschen. Dieselbe
Tabelle `order_images` und derselbe private Bucket `order-images` wie in der
Handy-App.

## Was geändert wurde

- Ablegefläche und Dateiauswahl, auch mehrere Dateien. JPEG, PNG, WebP und
  HEIC werden, soweit der Browser sie zeichnet, zu JPEG. Breite über 1920
  Pixel wird auf 1920 gebracht. Der Bucket nimmt nur JPEG bis 5242880 Bytes.
- `id` kommt vom Client, `user_id` ist der angemeldete Nutzer, `taken_at`
  kommt aus EXIF oder sonst aus der Dateizeit. `width` und `height` sind die
  Maße des gespeicherten JPEG.
- Erst die Datei, dann die Zeile. Schlägt das Insert fehl, wird die Datei
  wieder entfernt.
- Löschen fragt nach. Erst die Datei, „nicht gefunden“ gilt als Erfolg, ein
  HEAD prüft nach, dann die Zeile. Die Galerie lädt erst danach neu.
- Hochladen nur mit `canTakePhotos`. Löschen eigener Fotos damit, aller Fotos
  mit `canManageOrders`.

## Warum

Geschäftsführung und Polier sollen am Schreibtisch in dieselbe Galerie
schreiben, die auf der Baustelle schon existiert. Eine zweite Tabelle oder
ein PNG im Bucket liefe gegen `allowed_mime_types`. Die Löschreihenfolge ist
die der Handy-App, damit ein zweiter Versuch eine halb gelöschte Datei noch
aufräumt, ohne die Zeile vorher zu verlieren.

Die Handy-App (`BuenyA/bautakt-app`) war aus dieser Umgebung nicht lesbar.
Breite, Pfad und Rechte sind am 2026-10-08 an den vorhandenen Zeilen, dem
Bucket und den Policies gemessen.

Issue: [#48](https://github.com/BuenyA/bautakt-web/issues/48).

## Verweise

- Code: `apps/webapp/src/features/orders/OrderPhotos.tsx`,
  `prepareOrderImage.ts`, `useOrderImageMutations.ts`
- [auftragsfotos.md](../pages/auftragsfotos.md)
