# Kontakte

Ein Geschäftspartner existiert genau einmal; Kunde, Lieferant, Subunternehmer
und Sonstiger Kontakt sind Rollen. Das Schema, die RLS-Policies, die Nummernkreise
und `merge_contacts` gehören bautakt-app (Migration
`20261014204410_contacts.sql`, Issue BuenyA/bautakt-app#111) und werden hier nicht
wiederholt. Diese Seite beschreibt, wie die Webapp damit umgeht. Stand 2026-10-14.

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
