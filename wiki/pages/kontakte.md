# Kontakte

Ein Geschäftspartner existiert genau einmal; Kunde, Lieferant, Subunternehmer
und Sonstiger Kontakt sind Rollen. Das Schema, die RLS-Policies, die Nummernkreise
und `merge_contacts` gehören bautakt-app (Migration
`20261014204410_contacts.sql`, Issue BuenyA/bautakt-app#111) und werden hier nicht
wiederholt. Diese Seite beschreibt, wie die Webapp damit umgeht. Stand 2026-10-15.

## Warum Rollen statt Kunden-B2B/B2C

Ob jemand Kunde oder Lieferant ist, hängt an der Richtung des Geldes, nicht an der
Rechtsform. Ein Generalunternehmer, der beauftragt, ist Kunde (Leitweg-ID, §13b,
Zahlungsziel, das _wir_ gewähren); ein Baustoffhändler ist Lieferant (IBAN zum
Bezahlen, Zahlungsziel, das _er_ gewährt). Firma/Person ist deshalb `contacts.kind`,
die Rolle eine eigene Tabelle. Belege zeigen auf die Rolle: `orders.customer_id`
auf `customer_profiles`, `expenses.supplier_id` auf `supplier_profiles` — die
Datenbank lehnt einen Lieferanten als Auftraggeber ab.

## Bausteine (`features/contacts/`)

| Datei                                   | Aufgabe                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `contactModel.ts`                       | Anzeigename, aktive Rollen, §48b-Status, Einbehalt, IBAN-Prüfung. Rein.   |
| `contactDraft.ts`                       | Formularzustand, `changedFields` für Teil-Updates.                        |
| `contactListFilter.ts`                  | Reiter ↔ URL.                                                             |
| `useContacts.ts` / `useContact.ts`      | Liste mit eingebetteten Rollen (1:1 → Objekt), Detail, Personen, Konten.  |
| `useContactMutations.ts`                | Speichern in der Reihenfolge Kontakt → Lieferant → Sub → Kunde → Sonstig. |
| `ContactPicker.tsx`                     | Auswahl in Auftrag, Rechnungseditor, Ausgabe, Beteiligte; „Neu anlegen“.  |
| `pages/ContactsListPage.tsx`, `…Detail` | Liste mit Reitern, Detail mit Karte je Rolle.                             |

## Regeln, die hier gelten

- **Teil-Updates.** Das Formular schickt nur geänderte Felder (`changedFields`). In
  der Handy-App setzte das alte Kundenformular beim Speichern Finanzfelder zurück,
  weil es den ganzen Datensatz schrieb.
- **Rollen entfernt das Formular nicht.** Eine vorhandene Rolle ist im Formular
  gesperrt; archivieren oder entfernen geht über die Rollenkarte. Entfernen scheitert
  mit 23503, sobald ein Beleg daran hängt — `readableDbError` übersetzt das.
- **Löschen nur ohne Verwendung.** Der Menüpunkt erscheint nur, wenn `useContactUsage`
  nichts findet; die Datenbank prüft es ohnehin.
- **Bankkonten nur mit Finanzrecht.** Ohne `canViewCompanyFinance`,
  `canManageOverheadCosts` oder `canUseBillingModule` wird nicht einmal gefragt —
  eine leere Liste hieße fälschlich „kein Konto“. Eine geänderte Lieferanten-IBAN
  meldet die Datenbank dem Inhaber.
- **Festgeschriebene Rechnungen** zeigen `buyer_name` aus dem Beleg, Entwürfe den
  Kontakt (`features/finance/salesDocumentBuyer.ts`).
- **Länder als ISO-Code** (`DE`, `AT`, `CH`), nicht „Deutschland“. Aufträge speichern
  ihr Land noch als Wort (`orderEdit.ts`).
- **Konditionen im Rechnungseditor.** Wer einen Kunden wählt, bekommt Leitweg-ID,
  Zahlungsziel und Skonto aus `customer_profiles` vorbelegt
  (`features/finance/customerTerms.ts`). Gefüllt werden nur leere Felder und solche,
  die noch den Wert des vorher gewählten Kunden tragen — sonst bliebe beim
  Kundenwechsel die Leitweg-ID des falschen Kunden stehen. Bleibt „Fällig am“ leer,
  rechnet der Renderer Rechnungsdatum plus Zahlungsziel.
- **Lieferant am Artikel** steht im Katalog als Spalte (`articles.supplier_id`).
  Gepflegt wird er in der Handy-App; die Webapp hat kein Artikelformular. Artikel
  zählen bei „Verwendung“ mit, weil der Fremdschlüssel das Löschen sonst sperrt.
- **§48b in der Übersicht.** „Freistellungen §48b“ unter „Zu erledigen“ zeigt
  Subunternehmer, deren neueste Bescheinigung in 30 Tagen endet oder abgelaufen ist
  (`expiringExemptions` in `features/overview/today.ts`, Recht
  `canManageSuppliers`). Gleiche Grenze wie die Benachrichtigung
  `exemption.expiringSoon`; die zeigt Abgelaufenes aber nur einen Tag lang, die
  Aufgabe bleibt bis zur neuen Bescheinigung stehen.
- **Formular: nur das Nötige offen.** `ContactSheet` zeigt Name, Rollen, Anschrift,
  Telefon und E-Mail (Subunternehmer: Gewerk, §13b; Sonstiger: Funktion). Alles
  andere liegt unter „Weitere Angaben (optional)“ und öffnet sich von selbst, wenn
  dort schon etwas steht (`hasOptionalValues` in `contactDraft.ts`, Nummern zählen
  nicht) oder die Prüfung dort scheitert. Handy-App gleich.
