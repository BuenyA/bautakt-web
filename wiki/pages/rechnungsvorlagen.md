# Rechnungsvorlagen (Vorlagenmodul für Ausgangsbelege)

Ein Betrieb bestimmt selbst, wie seine Ausgangsbelege aussehen, legt dafür mehrere
Vorlagen an und wählt je Beleg eine aus. Die erste fertige Vorlage ist der Briefbogen
**„Spahrbau“**, nachgebaut nach drei echten Belegen von Spahr-Bau (Abschlags-,
Schlussrechnung, Gutschrift; Owner-Vorgabe 2026-10-30). Stand: 2026-10-30.

Schema, RLS und Renderer gehören `bautakt-app`:

- Migration `supabase/migrations/20261030231747_a_invoice_templates.sql`
- Renderer `supabase/functions/finance-document-render/template.ts` (Vorlage → Layout)
  und `letterhead.ts` (Layout „Briefbogen“), gespiegelt nach
  `packages/document-render/src/core/`.

## 1. Ziel und Leitplanken

- **„So komplex wie nötig, so simpel wie möglich.“** Eine Vorlage ist ein Grundlayout
  aus einer kleinen, festen Auswahl plus Einstellungen. Kein freier Layout-Baukasten
  (Drag & Drop, Koordinaten): der wäre für ein Handwerksbüro zu viel und gefährdet die
  Pflichtangaben.
- **Pflichtangaben sind nicht Sache der Vorlage.** Was § 14 UStG und EN 16931
  verlangen (Nummer, Datum, Leistungsdatum, Parteien, Steuer, Summen, Hinweise),
  kommt immer aus `InvoiceData` und steht in jedem Layout. Eine Vorlage ändert nur
  Anordnung, Farben, Zusatztexte.
- **Die E-Rechnung bleibt unberührt.** Das eingebettete XML (ZUGFeRD/XRechnung) hängt
  nicht an der Vorlage.
- **Festgeschrieben ist festgeschrieben.** Ein freigegebener Beleg ändert sich durch
  spätere Vorlagenänderungen nicht: sein PDF liegt im Archiv, und die GoBD-Sperre
  friert `invoice_template_id` mit ein.
- **Kaputte Vorlage verhindert keinen Beleg.** Ungültige Farben, unbekannte Schlüssel
  oder ein fehlendes Logo fallen auf Standardwerte zurück, mit Warnung — wie schon bei
  der Akzentfarbe.
- **Ohne Vorlage alles wie bisher.** Das Standard-PDF ist Byte für Byte unverändert
  (alle 32 Golden-Hashes gleich, 2026-10-30).

## 2. Begriffe

| Begriff             | Bedeutung                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Grundlayout         | Im Renderer programmiertes Layout. Heute `standard` (bisheriges PDF) und `letterhead`.         |
| Vorlage             | Zeile in `invoice_templates`: Name, Grundlayout, Einstellungen (jsonb).                        |
| Standardvorlage     | `is_default` – höchstens eine je Betrieb. Gilt für Belege ohne eigene Auswahl.                 |
| Voreinstellung      | Fertige Werte im Code, aus denen eine neue Vorlage entsteht („Spahrbau“, „Leerer Briefbogen“). |
| Betreff/Bauvorhaben | Neues Feld `sales_documents.subject`, steht über dem Belegtitel.                               |

## 3. Datenmodell

`invoice_templates`

| Spalte                     | Zweck                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| `company_id`               | Mandant, RLS.                                                                     |
| `name`                     | 1–80 Zeichen.                                                                     |
| `layout`                   | `standard` \| `letterhead` (CHECK).                                               |
| `settings`                 | jsonb-Objekt, Schlüssel siehe unten.                                              |
| `is_default`               | Partieller Unique-Index: eine Standardvorlage je Betrieb.                         |
| `archived_at`              | Archivieren statt löschen (FK von festgeschriebenen Belegen, ON DELETE RESTRICT). |
| `created_*`, `modified_at` | Herkunft; `modified_at` per Trigger.                                              |

`sales_documents` bekommt `invoice_template_id` (zusammengesetzter FK
`(invoice_template_id, company_id)` → nur Vorlagen des eigenen Betriebs) und
`subject text NOT NULL DEFAULT ''`. `save_sales_document_draft` übernimmt beide.

`set_default_invoice_template(company, template|null)` setzt die Standardvorlage
atomar (SECURITY INVOKER, Grant nur an `authenticated`).

**Rechte** (kein neuer Schlüssel): lesen mit `canUseBillingModule`,
`canViewCompanyFinance` oder `canManageCompanySettings`; anlegen, ändern, archivieren
nur mit `canManageCompanySettings`.

### Einstellungen (`settings`)

Alle Schlüssel optional. Gelesen und geprüft in `template.ts` (`resolveLetterhead`,
`templateTextsFor`).

| Schlüssel           | Typ                           | Wirkung (Briefbogen)                                        |
| ------------------- | ----------------------------- | ----------------------------------------------------------- |
| `primaryColor`      | `#RRGGBB`                     | Slogan, Leistungsaufzählung, breiter Streifen.              |
| `secondaryColor`    | `#RRGGBB`                     | Aufzählungspunkte, schmaler Streifen, Firmenname ohne Logo. |
| `services`          | string[] (≤ 12)               | Leistungen unter dem Logo.                                  |
| `slogan`            | string                        | Zeile über der Fußzeile.                                    |
| `sideStripes`       | bool (Standard an)            | Zwei Farbstreifen links, an der Falzmarke unterbrochen.     |
| `reference`         | string                        | Zeichen hinter dem Datum („ak-sz“).                         |
| `fax`, `website`    | string                        | Fußspalten „Telefax“ und „Internet“.                        |
| `extraBankAccounts` | {bankName, iban, bic}[] (≤ 3) | Weitere Banken neben der Hauptbank aus den Firmendaten.     |
| `legalLine`         | string                        | Rechtsangaben; leer = aus Registergericht, HR, GF, St.-Nr.  |
| `closingGreeting`   | string                        | Grußformel.                                                 |
| `signatureLines`    | string[]                      | Zeilen unter dem Gruß („S P A H R - B A U G M B H“).        |
| `texts[belegart]`   | {title, intro, footer}        | Titel im Beleg (nur Briefbogen) und Vorbelegung der Texte.  |

Was es schon an anderer Stelle gibt, steht **nicht** in der Vorlage: Logo, Anschrift,
Telefon, E-Mail, Hauptbank, Steuernummer, Registerangaben bleiben Firmendaten. Eine
Vorlage ergänzt nur. So ändert sich eine neue Bankverbindung an einer Stelle.

## 4. Renderer

1. Die Edge Function lädt mit dem Bündel die Vorlage: die am Beleg gewählte, sonst die
   Standardvorlage des Betriebs (`loadTemplate` in `index.ts`). Jeder Fehler dort
   heißt Standardlayout.
2. `buildInvoiceData` löst sie zu `InvoiceData.layout` auf und setzt
   `InvoiceData.subject`. **Beide Felder fehlen, wenn leer** — deshalb bleibt der
   Fingerabdruck alter Belege gleich, und die Freigabe-Prüfung (Vorschau = Original,
   bautakt-web#217) deckt die Vorlage automatisch mit ab.
3. `pdf.ts` verzweigt: `drawStandardDocument` (unverändert) oder
   `drawLetterheadDocument` + `drawLetterheadDecorations`.

### Layout „Briefbogen“ (`letterhead.ts`) — Abgleich mit den Spahr-Bau-Belegen

| Element der Vorlage                                | Umsetzung                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Großes Logo rechts oben                            | Logo der Firmendaten, max. 250 × 92 pt; ohne Logo der Firmenname.         |
| „• Hoch- u. Tiefbau …“ unter dem Logo              | `services`, Punkte in Zweitfarbe, Text in Hauptfarbe.                     |
| Blau/oranger Doppelstreifen links                  | `sideStripes`, Unterbrechung an der Falzmarke (105 mm).                   |
| Absenderzeile über der Anschrift                   | Firmenname · Straße · PLZ Ort, 6,6 pt.                                    |
| „Rechnungsnummer / Rechnungsdatum“ fett, „ak-sz“   | Kennzahlenblock; Bezeichnungen je Belegart, `reference` hinter dem Datum. |
| „BV: …“ fett, darunter „- Schlussrechnung -“       | `subject` + Titel (`texts[art].title` oder Standardtitel).                |
| „Gutschrift zur Rechnung 2026403 v. 25.09.26“      | Bei Gutschrift und Storno automatisch aus dem Bezug.                      |
| Summen mit Strich / Doppelstrich                   | Netto, MwSt. (unterstrichen), Brutto bzw. Rechnungsbetrag (doppelt).      |
| „abzgl. geleisteter Abschlagszahlungen“ mit Spalte | Schlussrechnung: Gesamtleistung, dann Abzug netto/MwSt. in Mittelspalte.  |
| „Mit freundlichen Grüßen … SPAHR - BAU GMBH“       | `closingGreeting`, `signatureLines`.                                      |
| Slogan in Orange, Rechtszeile, fünf Fußspalten     | `slogan`, `legalLine`, Telefon/Telefax, Internet/E-Mail, Bank, IBAN, BIC. |
| § 14-UStG-Hinweis klein                            | Steuerhinweise aus `InvoiceData.taxHints`, klein gesetzt.                 |

Bewusst anders als die Vorlage: Die Positionen stehen als Tabelle im Beleg (die
Spahr-Belege verweisen auf eine separate „Aufstellung“). Wer das so will, schreibt eine
Position „Nettosumme lt. Aufstellung“ – genau so sehen dann die Beispiele aus.
Schrift ist die eingebettete Plus Jakarta Sans (PDF/A verlangt eingebettete Schriften),
nicht Helvetica.

## 5. Oberfläche (Web)

- **Einrichtung → Karte „Rechnungsvorlagen“** (`InvoiceTemplatesCard.tsx`): Liste mit
  Layout, Standard- und Archiv-Markierung; „Neue Vorlage“ aus Voreinstellung
  (Spahrbau, leerer Briefbogen, Bautakt-Standard). Die erste Vorlage wird automatisch
  Standard. Menü je Vorlage: als Standard verwenden, archivieren/wiederherstellen.
- **Vorlage bearbeiten** (`/einstellungen/rechnungsvorlagen/:id`,
  `InvoiceTemplatePage.tsx`): links Grundlagen, Gestaltung, Brief, Fußzeile, Texte je
  Belegart; rechts ein Beispielbeleg (Abschlag, Schlussrechnung, Gutschrift, Rechnung),
  live aus dem ungespeicherten Formular im Web Worker gerendert
  (`useTemplatePreview.ts`, gleicher Kern wie die Function). Mit Musterkunde, echte
  Belege bleiben unberührt.
- **Beleg-Editor**: Feld „Vorlage“ (nur, wenn es Vorlagen gibt) und
  „Betreff / Bauvorhaben“. Ein neuer Beleg bekommt die Standardvorlage samt ihren
  Texten für die Belegart. Wechsel von Vorlage oder Belegart tauscht Einleitung und
  Schlusstext nur, wenn sie leer sind oder noch genau dem alten Vorlagentext
  entsprechen (`withTemplate`). Das Bündel der Live-Vorschau hängt an der
  Vorlagen-ID (`bundleKey`).

## 6. Einrichtung für die Demo „Spahrbau“

1. Migration einspielen (Supabase MCP `apply_migration`), Edge Function
   `finance-document-render` deployen, Typen neu erzeugen.
2. Firmendaten des Demo-Betriebs: Logo als **PNG** (SVG kann der Renderer nicht
   einbetten), Telefon `07147 / 2750-0`, E-Mail, Hauptbank KSK Ludwigsburg,
   Steuernummer, Registergericht „Amtsgericht Stuttgart“, HRB 290382, Geschäftsführer.
3. Einrichtung → Rechnungsvorlagen → Neue Vorlage → Briefbogen „Spahrbau“.
4. Neuer Beleg: Abschlagsrechnung, Betreff „BV: NB EFH, …“, eine Position
   „1. Abschlagszahlung - Baustelleneinrichtung“.

## 7. Ausbaustufen (nicht gebaut)

- **Weitere Grundlayouts** (z. B. „Kompakt“, „Klassisch DIN 5008 mit Fensterfalz“) —
  neuer Wert im CHECK, neue Datei neben `letterhead.ts`.
- **Logo je Vorlage** statt nur Firmenlogo (Storage-Pfad in `settings`, im Bündel
  mitladen, in den Fingerabdruck aufnehmen).
- **Vorlage je Kunde** als Vorbelegung (`customer_profiles.invoice_template_id`).
- **Mobile App**: Auswahl im App-Editor; heute rendert die App über dieselbe Function
  und bekommt damit die Standardvorlage des Betriebs automatisch.
- **Auftrag → Betreff**: „BV: <Auftrag>, <Baustellenadresse>“ vorbelegen.
- **Gesamtnachlass („Abgebot“)** als eigener Beleg-Abzug statt negativer Position.
- **Briefpapier-Modus**: Kopf und Fuß weglassen, wenn auf vorgedrucktes Papier gedruckt
  wird.
