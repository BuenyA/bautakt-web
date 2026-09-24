# 2026-09-24 — Auftrag aus der Liste anlegen

Die Auftragsliste kann einen Auftrag anlegen. Die Zeile landet in `orders`,
dieselbe Tabelle, die die Handy-App liest.

## Was geändert wurde

- Seitenpanel auf `/auftraege`, nur mit `canCreateOrders`. Pflicht ist die
  Bezeichnung. Kundenbezeichnung, Straße, PLZ, Ort und Beschreibung sind leer
  erlaubt. `customer_id` bleibt leer.
- `id` kommt vom Client (`crypto.randomUUID()`), weil `orders.id` kein Default
  hat. Status, Abrechnungsart und Land bleiben auf den Spalten-Defaults
  (`active`, `regie`, leerer Text).
- Nach dem Speichern öffnet die Detailseite des neuen Auftrags. Der `queryKey`
  `['orders', companyId]` wird invalidiert.
- Eine abgelehnte RLS-Policy (Postgres `42501`) wird als „Dafür fehlt dir die
  Berechtigung.“ gezeigt.
- Texte unter `domain:orders.create`.

## Warum

Die Demo braucht einen Auftrag, den das Web anlegt und die Handy-App danach
sieht. Dafür reicht ein kurzes Formular. Ein Kundenpicker, Fotos, Notizen und
Zeiten vom Web aus sind nicht Teil davon.

## Verweise

- [auftrag-anlegen.md](../pages/auftrag-anlegen.md)
- Code: `apps/webapp/src/features/orders/OrderSheet.tsx`
