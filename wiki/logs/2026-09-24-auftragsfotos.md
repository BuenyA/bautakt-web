# 2026-09-24 — Auftragsfotos nur lesend

Die Auftragsdetailseite zeigt die Fotos aus der Handy-App.

## Was geändert wurde

- `useOrderImages` liest `order_images` des Mandanten und signiert
  `storage_path` (`{companyId}/{orderId}/{imageId}.jpg`) im privaten Bucket
  `order-images` für 3600 Sekunden. Keine öffentliche URL.
- `OrderPhotos` hängt unter der Stammdatenkarte: Laden, Fehler mit erneutem
  Versuch, leerer Hinweis, Raster, Dialog für das einzelne Bild.
- Texte unter `domain:orders.photos`. Kein Upload, kein Löschen, kein
  Bearbeiten.

## Warum

Geschäftsführung sieht am Schreibtisch, was auf der Baustelle fotografiert
wurde, ohne eine zweite Schreibstelle neben der Offline-App zu öffnen. Die
Signatur läuft nach einer Stunde ab; die Query erneuert sie vorher, sonst
brechen die Bilder in einer offen gelassenen Seite.

## Verweise

- Code: `apps/webapp/src/features/orders/useOrderImages.ts`,
  `apps/webapp/src/features/orders/OrderPhotos.tsx`
- [auftragsfotos.md](../pages/auftragsfotos.md)
