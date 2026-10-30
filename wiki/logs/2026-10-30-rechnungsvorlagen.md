# 2026-10-30 — Rechnungsvorlagen und Briefbogen „Spahrbau“

**Anlass:** Owner möchte Ausgangsbelege in eigenen Vorlagen verschicken und am
31.10. eine Demo mit der Vorlage von Spahr-Bau zeigen. Grundlage waren drei echte
Belege (Abschlags-, Schlussrechnung, Gutschrift) und das Logo als SVG.

**Was sich geändert hat**

- `bautakt-app`: Tabelle `invoice_templates`, `sales_documents.invoice_template_id`
  und `.subject`, RPC `set_default_invoice_template`, Renderer-Layout `letterhead`
  (`template.ts`, `letterhead.ts`), Vorlage im Bündel der Function.
- Hier: Kopie des Kerns per `npm run sync` (zwei neue Kern-Dateien in
  `scripts/sync.mjs`), Karte „Rechnungsvorlagen“ in der Einrichtung, Seite
  `/unternehmen/rechnungsvorlage/:id` mit Live-Vorschau, Vorlage und
  Betreff im Beleg-Editor.

**Warum so**

- Feste Grundlayouts plus Einstellungen statt freiem Baukasten: Pflichtangaben
  bleiben im Code, das Büro stellt nur Farben und Texte ein.
- `layout` und `subject` stehen nur in `InvoiceData`, wenn gesetzt. Damit blieben
  alle 32 Golden-Hashes gleich; nur die Eingaben im Golden-File tragen zwei neue
  Firmenfelder (`register_court`, `managing_directors`).
- Archivieren statt löschen, weil festgeschriebene Belege auf die Vorlage zeigen
  und die GoBD-Sperre ein `ON DELETE SET NULL` ablehnen würde.

**Geprüft:** `npm run check` grün; die drei Beispielbelege und ein vierseitiger
Beleg ohne Logo wurden lokal mit dem Kern gerendert und gegen die Originale
verglichen. Im Browser gegen die Datenbank erst nach Einspielen der Migration.

Konzept und Einrichtung: [rechnungsvorlagen.md](../pages/rechnungsvorlagen.md).

## Nachtrag: eine Seite statt Liste plus Akzentfarbe

Nach dem ersten Test war die Seite unübersichtlich: Vorlagenliste, Logo und das alte
Akzentfarben-Formular standen nebeneinander. Jetzt gibt es nur noch ein Auswahlmenü
(„Bautakt Standard“ fest, darunter die eigenen Vorlagen), „Neue Vorlage“, Speichern,
links die Felder, rechts die Vorschau. Akzentfarbe, Einleitung und Schlusstext des
Betriebs sind aus der Web-Oberfläche entfernt.
