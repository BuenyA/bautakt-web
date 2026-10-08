# Material am Auftrag

Die Auftragsdetailseite zeigt das Material eines Auftrags und legt es an,
ändert es und löscht es. Die Zeile liegt in `order_materials`, derselben
Tabelle, die die Handy-App liest und per Sync schreibt. Katalogpflege,
QR-Scan und Material nur im Bautagebuch sind nicht dabei.

## Was die Seite zeigt

`OrderMaterials` steht unter der Stammdatenkarte auf `OrderDetailPage`,
unter den Zeiten. Vier Zustände: Skelett beim Laden, Fehler mit „Erneut
versuchen“, leerer Hinweis („Noch kein Material“), Liste der Zeilen. Jede
Karte ist eine weiche Card (`rounded-xl`, `bg-card`, `shadow-sm`) und zeigt
Bezeichnung, Menge, Einheit, Datum, Einkaufs- und Verkaufspreis, soweit sie
gesetzt sind, die Notiz und den Namen aus `profiles`. Ein abgerechneter
Eintrag trägt „Abgerechnet“. Neueste Nutzung zuerst. Die Optik steht in
[webapp-shell.md](webapp-shell.md#detailflächen).

Wer die Zeile ändern darf, öffnet die Karte als Knopf das Panel. Wer sie nur
lesen darf, sieht dieselbe Karte ohne Knopf. „Material erfassen“ steht in der
Überschrift und im leeren Zustand, sobald das Konto `canRecordMaterials` hat.

Die Abfrage steckt in `useOrderMaterials`: `order_materials`, gefiltert auf
die `company_id` der Mitgliedschaft und die `order_id`, sortiert nach
`used_at` absteigend, danach `created_at`. Der `queryKey` ist
`['order-materials', companyId, orderId]`. Nach dem Speichern und nach dem
Löschen wird `['order-materials', companyId]` invalidiert, dazu die
Beleg-Caches `sales-documents` und `sales-document`. Dialog und Panel bleiben
offen, bis das Löschen bestätigt ist. Der Knopf zeigt „Wird gelöscht …“.

Der Index `order_materials_order_id_used_at_idx` liegt auf
`(order_id, used_at DESC, created_at DESC)` und trifft diese Sortierung.
_Stand 2026-10-08._

## Formular

Pflicht, wie in der Handy-App: genau eines von Katalogartikel und
Freitext-Bezeichnung, Menge größer als 0, Einkaufspreis größer als 0, Datum.
Die Einheit ist frei; leer wird `Stk.`, der Spalten-Default. Die Notiz darf
leer sein. Ein Icon-Picker gibt es nicht.

Der Katalog ist nur die Auswahl. `useArticles` ist dieselbe Abfrage wie
`/katalog`. Inaktive Artikel fehlen, außer die Zeile hängt schon an einem.
Bei der Wahl werden Einheit, Einkaufspreis und Verkaufspreis aus dem Artikel
übernommen. Ein leerer Verkaufspreis lässt das Feld leer: die Rechnung nimmt
dann den Einkaufspreis (`unit_price ?? unit_cost` im Line-Generator der
Handy-App). Der Verkaufspreis bleibt danach editierbar, auch bei Freitext.

Einkaufspreis und Verkaufspreis stehen beim Öffnen und nach der Artikelwahl
über `formatMoneyInput` (`packages/finance/src/money.ts`) als de-DE mit genau
zwei Nachkommastellen im Feld, ohne Tausenderpunkt und ohne Währungszeichen:
`1,5` wird `1,50`, leer bleibt leer. Die Menge bleibt bei `decimalInput`
(bis zu vier Stellen, ohne festes Nachkomma). `parseDecimal` ist unverändert;
`1,50` und `1.50` lesen sich wieder als `1,5`.

Stand 2026-10-08 hat der einzige Artikel von Spahrbau („Wat weis ich“) weder
Einkaufs- noch Verkaufspreis.

`order_materials.id` hat kein Default. Der Client setzt
`crypto.randomUUID()`. `modified_at` setzt der Client mit; die Spalte hat
keinen Default. `user_id` ist beim Anlegen der angemeldete Nutzer. Die
Insert-Policy verlangt das.

Beim Bearbeiten gehen `article_id` und `custom_title` immer gemeinsam mit,
sonst bliebe die alte Spalte stehen und der Check schlüge fehl. Dazu Menge,
Einheit, beide Preise, Notiz, `used_at` und `modified_at`. Ungeschrieben
bleiben `user_id`, `company_id`, `order_id`, `created_at`, `icon`,
`is_billable`, `billed_document_id` und `daily_report_id`. Ist der getrimmte
Inhalt gleich dem gespeicherten, gibt es keinen Schreibzugriff.

## Abgerechnet

Eine Zeile mit `billed_document_id` lässt sich hier nicht ändern und nicht
löschen. Das Panel zeigt den Hinweis und keinen Speichern-Knopf. „Material
löschen“ sitzt sonst links in der Fußleiste, neben Abbrechen und Speichern
rechts; bei einer abgerechneten Zeile fehlt der Knopf. Die
Datenbank sperrt das nicht für Konten mit `canUseBillingModule`: der Trigger
`enforce_order_material_billing_fields` friert `is_billable` und
`billed_document_id` nur ohne dieses Recht ein (gemessen 2026-10-08). Die
Oberfläche prüft die Spalte noch einmal direkt vor dem Schreiben. Eine
Sperre in der Datenbank wäre eine Migration in `bautakt-app` und ist hier
nicht angewendet.

Zeilen auf einem Entwurf (`sales_document_lines.source_type =
'order_material'`, Beleg noch `draft`) setzen `billed_document_id` nicht.
Der Entwurf ist eine Kopie. Ändern oder Löschen des Materials schreibt die
Position nicht um. Der nächste Entwurf, den die Handy-App aus dem Material
baut, sieht `unit_price` und fällt nur bei NULL auf `unit_cost` zurück.
`finalize_sales_document` setzt `billed_document_id` erst beim
Festschreiben. Stand 2026-10-08: am Musterauftrag hängen zwei abgerechnete
Zeilen an RE00001, beide ohne `unit_price`; die Positionen tragen den
damaligen Einkaufspreis.

## Recht

Knöpfe hängen an `canCreateOrderMaterial` und `canEditOrderMaterial`. Das
blendet sie aus und ist keine Kontrolle.

- `canRecordMaterials`: anlegen. Bearbeiten und löschen nur, wo `user_id`
  der angemeldete Nutzer ist.
- `canManageOrders`: bearbeiten und löschen für jede sichtbare Zeile, auch
  ohne `canRecordMaterials`. Anlegen bleibt an `canRecordMaterials`.
- `canViewCompanyFinance` oder `canViewOrderFinance`: die Liste, ohne
  Schreib-Knopf. Die Karte öffnet sich nicht.
- keines davon: keine Zeilen. Die Oberfläche zeigt dann denselben leeren
  Hinweis wie bei einem Auftrag ohne Material.

Select ist damit enger als Update. `canManageOrders` allein besteht die
Update-Policy und scheitert an der Select-Policy, solange weder
`canRecordMaterials` noch eine Finanzsicht da ist. Gemessen 2026-10-08 an
den Policies von `order_materials`. Unter den Systemrollen von Spahrbau hat
jede Rolle mit `canManageOrders` auch `canRecordMaterials`. Buchhaltung
liest über die Finanzsicht und schreibt nicht. Praktikant sieht keine Zeile.

Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die
Berechtigung.“ (`readableDbError`, Postgres `42501`). Policies stehen im
Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/bautakt-app/blob/main/wiki/index.md>.

## Sync

Die Handy-App schreibt per `order_material.upsert` und löscht per
`order_material.delete`. Das ist Last-Write-Wins aus dem Geräte-Cache. Die
Webapp legt per Insert an und ändert per schmalem Update, damit eine
Korrektur am Schreibtisch Abrechnung, Bericht oder Icon nicht umschreibt.
Ein Gerät, das die alte Zeile noch im Cache hat, kann die Änderung beim
nächsten Push überschreiben. Das ist das bestehende Sync-Modell; diese
Seite fügt keine Spalte hinzu.

`increment_article_usage_count` erhöht `usage_count` beim Insert mit
`article_id`. Die Webapp schreibt den Zähler nicht selbst.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`order_materials` bereits. Diese Änderung hat das Schema nicht angefasst.
