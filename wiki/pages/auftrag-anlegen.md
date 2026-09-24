# Auftrag anlegen

Die Auftragsliste legt einen Auftrag in `orders` an und öffnet danach die
Detailseite. Die Zeile liegt in derselben Tabelle, die die Handy-App liest.
Fotos, Notizen und Zeiten bleiben auf der Detailseite nur lesend.

## Formular

Ein Seitenpanel auf `/auftraege`, Knopf „Auftrag anlegen“. Das Panel ist nur
gemountet, solange es offen ist, und startet deshalb jedes Mal leer
(`OrderSheet`).

Pflicht laut Schema, Stand 2026-09-24: `id`, `company_id`, `name`. `orders.id`
hat kein `DEFAULT gen_random_uuid()` — der Client setzt `crypto.randomUUID()`,
wie bei den anderen Tabellen, die die Handy-App offline anlegt
([fallstricke.md](fallstricke.md)).

Mit im Formular, leer erlaubt: Kundenbezeichnung (`customer_label`), Straße,
PLZ, Ort, Beschreibung. `customer_id` bleibt leer. Ein Kundenstamm-Picker ist
nicht dabei; die Liste zeigt ohnehin `customer_label`.

Nicht gesetzt, damit die Spalten-Defaults gelten: `status` (`active`),
`billing_mode` (`regie`), `country` (leerer Text). Der Trigger
`enforce_order_status_rules` lässt beim INSERT jeden Startstatus zu. `finished`
bräuchte `canCompleteOrders`; `active` nicht. Eine Bezeichnung aus nur
Leerzeichen lehnt das Formular ab — dieselbe Ausnahme wie beim Kundenformular,
weil die Zeile sonst in der Liste nicht wiederzufinden ist. Die Spalte selbst
nähme den leeren Text an.

## Recht

Der Knopf hängt an `usePermission('canCreateOrders')`. Das blendet ihn aus und
ist keine Kontrolle. Die Grenze ist die Insert-Policy auf `orders`:
`has_company_permission(company_id, 'canCreateOrders')`. Lehnt die Datenbank
ab, zeigt das Formular „Dafür fehlt dir die Berechtigung.“ (`readableDbError`,
Postgres `42501`).

Welches Recht welche Rolle trägt, steht im Wiki von `bautakt-app`:
<https://github.com/BuenyA/craft/blob/main/wiki/pages/berechtigungen-und-rollen.md>.
Wie das Web die Flags liest: [berechtigungen-im-web.md](berechtigungen-im-web.md).

## Nach dem Speichern

Die Mutation invalidiert `['orders', companyId]`. Liste und Detail hängen an
diesem Präfix. Danach Navigation auf `/auftraege/:id`.

## Code

- `apps/webapp/src/features/orders/OrderSheet.tsx`
- `apps/webapp/src/features/orders/orderDraft.ts`
- `apps/webapp/src/features/orders/pages/OrdersListPage.tsx`
