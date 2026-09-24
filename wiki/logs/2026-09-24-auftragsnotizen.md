# 2026-09-24 — Auftragsnotizen nur lesend

Die Auftragsdetailseite zeigt die Notizen aus der Handy-App.

## Was geändert wurde

- `useOrderNotes` liest `order_notes` des Mandanten, gefiltert auf `order_id`,
  sortiert nach `created_at` absteigend. Autor über `profiles` (`user_id`).
  Kein Insert, kein Update, kein Delete.
- `OrderNotes` hängt unter der Fotogalerie: Laden, Fehler mit erneutem Versuch,
  leerer Hinweis, Karten mit Titel, Text, Zeitstempel und Autor.
- Texte unter `domain:orders.notes`.

## Warum

Geschäftsführung sieht am Schreibtisch, was auf der Baustelle notiert wurde,
ohne eine zweite Schreibstelle neben der Offline-App zu öffnen. Dieselbe
Lesestelle wie bei den Fotos, an derselben Tabelle, die die App schon schreibt.

## Verweise

- Code: `apps/webapp/src/features/orders/useOrderNotes.ts`,
  `apps/webapp/src/features/orders/OrderNotes.tsx`
- [auftragsnotizen.md](../pages/auftragsnotizen.md)
