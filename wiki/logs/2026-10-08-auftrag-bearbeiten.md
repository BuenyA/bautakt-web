# 2026-10-08 — Auftrag im Web bearbeiten

Die Auftragsdetailseite kann die Stammdaten ändern. Die Zeile bleibt in
`orders`, dieselbe Tabelle, die die Handy-App liest.

## Was geändert wurde

- Knopf „Bearbeiten“ auf `/auftraege/:id`, nur mit `canManageOrders`.
  `OrderSheet` hat dafür den Modus `edit` und startet mit dem geladenen
  Auftrag. Anlegen (`mode: 'create'`) bleibt das kurze Formular.
- Felder wie „Details bearbeiten“ in der App, ohne Icon und Titelbild:
  Bezeichnung, Kunde, Kostenstelle, Straße, PLZ, Ort, Land, Beginn, Ende,
  Beschreibung. Name nicht leer, Ende nicht vor Beginn.
- Update ist ein Teilpatch plus `modified_at`, gefiltert auf `id` und
  `company_id`, mit `.select('id').maybeSingle()`. Keine Zeile heißt
  Rechtefehler. Unveränderte Felder fehlen im Patch.
- `customer_id` und `cost_center_id` werden nie auf null gesetzt. Eine
  Freitext-Bezeichnung ohne Id bleibt, solange der Kunde nicht angefasst
  wird, und bleibt editierbar. Id und Label gehen gemeinsam mit, sobald ein
  Stammkunde gewählt wird. Dieselbe Paar-Regel für die Kostenstelle.
- Wechselt der Kunde und der Auftrag hat Belegpositionen, erscheint ein
  Hinweis. Gespeichert wird trotzdem.
- Nach dem Speichern invalidiert die Mutation `['orders', companyId]`.

## Warum

Geschäftsführung und Polier korrigieren am Schreibtisch dieselbe Zeile, die
auf der Baustelle schon existiert. Ein Update der ganzen Zeile würde Status,
Summe oder Titelbild aus dem Formular zurückschreiben. Die Handy-App schickt
deshalb seit dem 24.09.2026 nur den Teilpayload. Keine Migration: die
Update-Policy ist `canManageOrders`, `modified_at` hat keinen Trigger.

Issue: [#53](https://github.com/BuenyA/bautakt-web/issues/53).

## Verweise

- [auftrag-bearbeiten.md](../pages/auftrag-bearbeiten.md)
- Code: `apps/webapp/src/features/orders/OrderSheet.tsx`, `orderEdit.ts`,
  `useUpdateOrder.ts`
