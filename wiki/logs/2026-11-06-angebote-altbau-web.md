# 2026-11-06 Angebote: Altstatus im Web gelöst (1e, bautakt-app#184)

**Was:** `OrderStatusBadge`, `orderList.ts`, `orderEdit.ts` und die Abfrage der
Enddaten in `useTodayData.ts` kennen keinen Angebotsstatus mehr.
`toOrderStatus` bildet `quote` auf laufend und `declined` auf abgeschlossen ab,
wie `toOrderStatus` in der App. Die Locale-Keys `orderStatus.quote` und
`orderStatus.declined` sind entfallen.

**Warum:** Angebote haben eigene Tabellen. Die Migration
`ang_quote_legacy_drop` (1f) beschränkt `orders.status` auf `active|finished`.
Bis dahin darf kein Wert verloren gehen, und Web und App müssen dasselbe
zeigen.

**Prüfung:** `src/features/orders/orderList.test.ts` (neu), `npm run check`
18/18 Aufgaben grün. Der Prettier-Schritt meldet nur
`DeleteCompanyPage.tsx`, die Datei ist auf `main` schon so (c56a5e1) und
nicht Teil dieser Änderung.

Seite: [webapp-shell.md](../pages/webapp-shell.md), Abschnitt Auftragsliste.
