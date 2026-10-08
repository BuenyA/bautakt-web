# 2026-10-08 — Material am Auftrag

Die Auftragsdetailseite liest `order_materials` und legt Zeilen an, ändert
sie und löscht sie. Dieselbe Tabelle schreibt die Handy-App.

## Was geändert wurde

- Block „Material“ unter den Zeiten auf `/auftraege/:id`. Karte mit
  Bezeichnung, Menge, Preisen, Datum, Notiz, Autor. „Abgerechnet“, sobald
  `billed_document_id` gesetzt ist.
- Seitenpanel zum Anlegen und Bearbeiten. Katalogartikel oder Freitext,
  nie beides. Bei der Artikelwahl werden Einheit, Einkaufspreis und
  Verkaufspreis übernommen. Kein Icon-Picker, keine Katalogpflege.
- Löschen mit Bestätigung. Abgerechnete Zeilen haben keinen Speichern- und
  keinen Löschen-Knopf; die Mutation liest `billed_document_id` noch einmal.
- Insert mit clientseitiger `id`, `user_id` des angemeldeten Nutzers,
  `created_at` und `modified_at`. Update schreibt die Inhaltsfelder und
  immer beide Titelspalten, nie Abrechnung, Bericht oder Icon.
- Nach dem Speichern werden `order-materials`, `sales-documents` und
  `sales-document` invalidiert. Ein vorhandener Entwurf ist eine Kopie und
  ändert seine Position nicht.

## Warum

Ohne den Block sieht das Web Material, das die Baustelle schon erfasst hat,
nicht, und kann keins nachtragen. Der Verkaufspreis muss beim Artikel mit,
sonst fällt die nächste Rechnung auf den Einkaufspreis zurück — bei Spahrbau
ist `unit_price` auf allen vier Zeilen NULL (gemessen 2026-10-08). Die
Datenbank sperrt abgerechnete Zeilen nicht für die Geschäftsführung; das
tut die Oberfläche, analog zu den Zeiten.

Issue: [#55](https://github.com/BuenyA/bautakt-web/issues/55).

## Verweise

- [auftragsmaterial.md](../pages/auftragsmaterial.md)
- Code: `apps/webapp/src/features/orders/OrderMaterials.tsx`,
  `OrderMaterialSheet.tsx`, `orderMaterialDraft.ts`,
  `useOrderMaterialMutations.ts`
