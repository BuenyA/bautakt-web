# Auftrag bearbeiten

Die Auftragsdetailseite ändert die Stammdaten in `orders`. Dieselbe Zeile
liest die Handy-App. Anlegen bleibt das kurze Formular auf der Liste, siehe
[auftrag-anlegen.md](auftrag-anlegen.md). Löschen und Statuswechsel sind
nicht dabei.

## Einstieg

Knopf „Bearbeiten“ auf `/auftraege/:id`, nur mit `canManageOrders`. Das
blendet ihn aus und ist keine Kontrolle. Die Grenze ist die Update-Policy
auf `orders`: `has_company_permission(company_id, 'canManageOrders')` als
USING und CHECK. Gemessen 2026-10-08. Es gibt kein `canEditOrders`.

Welches Recht welche Rolle trägt, steht im Wiki von `bautakt-app`:
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/pages/berechtigungen-und-rollen.md>.
Wie das Web die Flags liest: [berechtigungen-im-web.md](berechtigungen-im-web.md).

Lehnt die Datenbank ab, oder kommt keine Zeile zurück, zeigt das Formular
„Dafür fehlt dir die Berechtigung.“ (`readableDbError`, Postgres `42501`,
oder `.select('id').maybeSingle()` ohne Zeile). Ein verweigertes Update
meldet RLS oft als Erfolg ohne Zeile.

## Formular

Dasselbe Seitenpanel wie beim Anlegen (`OrderSheet`), Modus `edit`. Es ist
nur gemountet, solange es offen ist, und startet deshalb mit dem geladenen
Auftrag.

Felder, wie „Details bearbeiten“ in der Handy-App, ohne Icon und Titelbild:

- Bezeichnung, Pflicht, nach dem Trim nicht leer. Die Meldung
  „Bitte einen Namen eingeben.“ steht am Feld und verschwindet, sobald der
  Name nicht mehr leer ist. Dieselbe Meldung im Anlegen-Modus. Am Ende des
  Panels wäre sie beim Bearbeiten unter dem Falz: `SheetBody` scrollt, der
  Speichern-Knopf bleibt stehen.
- Kunde. Ist `customer_id` gesetzt, nur die Auswahl aus `customers`. Ist sie
  leer, bleibt `customer_label` ein editierbares Freitextfeld. Eine Auswahl
  setzt `customer_id` und `customer_label` gemeinsam. Zurück auf „kein
  Kunde“ gibt es nicht: die Id wird nie `null`.
- Kostenstelle, Auswahl aus `cost_centers`. Ebenfalls kein Zurück auf leer.
  Das Label ist „Nummer – Name“, mit Gedankenstrich, wie in den vorhandenen
  Zeilen (gemessen 2026-10-08, z. B. `KS-1002 – Musterkostenstelle`).
- Straße, PLZ, Ort, Land, Beginn, Ende, Beschreibung.

Land ist eine Liste. Standard in der Anzeige ist „Deutschland“. Die
Handy-App hält sie als `ALLOWED_COUNTRIES` in `app/lib/utils`; dieses Repo
kann das private Repo nicht lesen. Die drei Werte hier sind die
deutschsprachigen Namen, die in den Adressen dieses Projekts vorkommen
(Aufträge: „Deutschland“; Kunden und Betriebe zusätzlich „Schweiz“), plus
Österreich. Ein gespeicherter Text außerhalb der Liste bleibt auswählbar.
Ein leeres Land zeigt „Deutschland“, wird aber erst geschrieben, wenn der
Nutzer ein Land wirklich wählt. Stand 2026-10-08: 12 Aufträge
„Deutschland“, einer mit leerem Text.

Beginn und Ende sind `date`. Das Ende darf nicht vor dem Beginn liegen.
Derselbe Tag ist erlaubt. Ein leeres Datum ist erlaubt und wird als `null`
geschrieben, wenn es vorher gesetzt war.

## Teilpatch

Geschrieben wird nur, was sich gegen den Stand beim Öffnen geändert hat,
plus `modified_at`. Die Spalte hat keinen Default und keinen Trigger; der
Client setzt den Zeitstempel. Hat sich nichts geändert, gibt es keinen
Schreibzugriff.

`customer_id` und `customer_label` gehen nur gemeinsam mit, wenn ein
Stammkunde neu gewählt wurde. Eine Freitext-Bezeichnung ohne Id geht nur
mit, wenn der Text sich geändert hat. Die Id bleibt dann draußen. Dieselbe
Paar-Regel für `cost_center_id` und `cost_center_label`.

Nie im Patch: `status`, `billing_mode`, `contract_sum`,
`quote_accepted_at`, `icon`, `cover_image_path`, `company_id`,
`created_at`, `id`.

Der Trigger `enforce_order_status_rules` prüft die Übergangsmatrix nur,
wenn sich `status` ändert (gemessen 2026-10-08). Ein Stammdaten-Patch lässt
ihn in Ruhe, außer bei Status `declined`: dann setzt der Trigger
`quote_accepted_at` auf null. Das ist der Widerspruch, den der Trigger
auflöst. Stand 2026-10-08 hat kein Auftrag ein `quote_accepted_at`.

## Kunde mit Belegen

Ein Kundenwechsel ist erlaubt. Hängt an dem Auftrag mindestens eine Zeile
in `sales_document_lines` (`order_id`), zeigt das Formular vor dem
Speichern einen Hinweis und speichert trotzdem. Die Belege behalten ihr
eigenes `customer_id`.

Die Select-Policy auf den Positionen verlangt `canUseBillingModule`,
`canViewOrderFinance` oder `canViewManagementInvoices`. Ein Polier hat
`canManageOrders` und keines der drei (Systemrolle, Stand 2026-10-08). Für
ihn bleibt der Hinweis aus, weil die Abfrage leer zurückkommt. Geschäftsführung
und Bauleiter sehen ihn. Stand 2026-10-08: ein Auftrag (`Musterauftrag`)
mit 32 Positionen auf 4 Belegen.

## Nach dem Speichern

Die Mutation invalidiert `['orders', companyId]`. Liste
(`['orders', companyId]`) und Detail
(`['orders', companyId, 'detail', id]`) hängen an diesem Präfix.

## Code

- `apps/webapp/src/features/orders/OrderSheet.tsx`
- `apps/webapp/src/features/orders/orderEdit.ts`
- `apps/webapp/src/features/orders/useUpdateOrder.ts`
- `apps/webapp/src/features/orders/pages/OrderDetailPage.tsx`
