# Angebote

Neuer Angebotsbereich, Umsetzungsplan in `bautakt-app` unter
`documentation/angebote/umsetzungsplan.md`, Datenmodell und Rechte im Wiki der App
(`wiki/pages/angebote.md`). Hier steht nur, was das Web betrifft.

## Stand

- **1b Liste und Detailseite** (web#291).
- **1c Editor und Umschalten** (web#292): Der Bereich steht in der Leiste vor „Aufträge“
  (`canViewQuotes`). Routen: `/angebote` Liste, `/angebote/neu` (`canCreateQuotes`),
  `/angebote/:id` Detail, `/angebote/:id/bearbeiten` (`canEditQuotes`). Der Reiter
  „Angebote“ unter Rechnungen, die alte Liste aus `sales_documents` und `type="quote"`
  im Belegeditor sind entfernt. Alte Angebotsbelege (Production: 0) öffnet die Auftragsseite
  über die Belegseite, neue Angebote eines Auftrags stehen dort in eigener Karte.

## Editor

- **Baum als flache Liste.** `quoteTree.ts` hält die Knoten in Lesereihenfolge, Kinder
  direkt hinter ihrem Titel; Ebene und OZ ergeben sich daraus. Drag & Drop verschiebt
  einen Block, der waagerechte Versatz wählt die Ebene (Muster aus dem Baum-Beispiel von
  `@dnd-kit`). Eltern sind immer Titel, wie es `save_quote_draft` verlangt.
- **OZ-Maske fest `11.22.3333`.** Zwei Titelebenen (Titel, Untertitel), Positionen in
  Zehnerschritten (`01.02.0010`), Texte ohne OZ. Eine Maske je Angebot bräuchte eine
  Spalte; das kommt mit GAEB (Phase 6), wo die Maske aus der Datei stammt.
- **Summen wie der Server.** `quoteTotals` rechnet je Steuersatz, rundet jede Position
  einmal (`round(quantity * unit_price, 2)`), dann den Nachlass je Gruppe, dann die
  Umsatzsteuer, kaufmännisch. Alternativ- und Bedarfspositionen zählen nie und stehen
  getrennt. Beim Festschreiben gehen Netto und Brutto des Editors mit; weicht der Server
  ab, scheitert es mit `QUOTE_TOTAL_MISMATCH` statt still eine andere Summe zu drucken.
- **Steuerart wie auf Rechnungen.** Dieselbe Auswahl (`TAX_MODES`), Kleinunternehmer
  gesperrt auf `small_business`, `tax_category` an jeder Position, außerhalb von
  `standard` 0 %. Hinweistext und Warnung bei § 13b ohne USt-IdNr. wie im Belegeditor.
- **Festschreiben** fragt nach, speichert zuerst und ruft dann `issue_quote_version`.
  Danach ist der Editor gesperrt; „Neue Version“ legt eine Kopie an
  (`create_quote_version`), „Gültig bis“ wird dabei neu vorbelegt.
- **Abbruch beim Speichern:** Kopf und Baum speichert `save_quote_draft` in einer
  Transaktion. Bricht sie ab (Netz weg, ungültiger Baum), bleibt der alte Stand in der
  Datenbank und die Eingaben im Editor stehen, Status „Nicht gespeichert“.
- **Langtext ist vorerst einfacher Text.** Eingeschränktes HTML (Plan, Abschnitt 4) kommt
  mit dem PDF in 1d, weil erst dort feststeht, was der Renderer kann.

## 500 Positionen (gemessen)

Gemessen am 05.11.2026 mit 10 Titeln und 500 Positionen, Produktions-Build, Chromium,
Entwicklungsrechner; in Klammern mit vierfach gedrosselter CPU:

| Vorgang                         | Zeit          |
| ------------------------------- | ------------- |
| Editor laden bis letzte Zeile   | 0,7 s (2,5 s) |
| Tastendruck bis Anzeige, Median | 17 ms (66 ms) |
| Ziehen über drei Zeilen         | 1,0 s (3,3 s) |
| Position anlegen                | 0,5 s (2,5 s) |

Was das gekostet hat, damit es keiner zurückbaut:

- **Jede Zeile abonniert ihre Daten selbst** (`useSyncExternalStore` über einen kleinen
  Store im Editor). Vorher renderte jeder Tastendruck alle 510 Zeilen zweimal, gemessen
  0,8 s je Taste: `DndContext` gibt beim Rendern neue Kontextwerte weiter, und jede
  sortierbare Zeile hängt daran. `memo` allein hilft dagegen nicht.
- **Hülle und Inhalt getrennt.** dnd-kit rendert beim Ziehen jede sortierbare Zeile je
  Mausbewegung. Die Hülle trägt nur Griff und Verschiebung, der Inhalt bleibt gemerkt.
- **Native Eingabefelder und Knöpfe in den Zeilen**, mit Fluent-Tokens gestaltet. Drei
  Fluent-`Button` und ein `Menu` je Zeile kosteten bei 500 Zeilen die Hälfte der Zeit.
- **Feste Optionen für `useSensor`**: Ein neues Objekt je Rendern ergibt neue Sensoren und
  hebelt das Merken aus.
- **Fokus im Layout-Effekt**, nicht per `requestAnimationFrame`: Sonst landen die ersten
  Buchstaben nach „Position“ auf dem Knopf (im Produktions-Build beobachtet).

## Warum so

- **Status kommt vom Server.** `quote_overview` rechnet Entwurf, offen, abgelaufen und die
  Entscheidung, Stichtag Berliner Zeit. Die Web-App filtert nur. Eine zweite Statuslogik
  im Client liefe beim ersten Sonderfall auseinander.
- **Euro-Summen ohne Franken.** Die Kennzahlen zählen CHF-Angebote mit, rechnen sie aber
  nicht in die Euro-Summe. Ein Hinweis erscheint, sobald das passiert.
- **Kunde über `quotes`, nicht über die Sicht.** `quote_overview` hat keine Beziehung zu
  `customer_profiles`. Der Name kommt aus einer zweiten Abfrage auf `quotes`. Sieht ein
  Nutzer den Kontakt per RLS nicht, bleibt die Spalte leer statt eines Fehlers.
- **Kein Kalkulationsfeld im Web-Abruf.** Liste, Detail und Editor lesen nur Spalten ohne
  Kosten und Marge, auch die CSV. Die Kalkulation kommt in Phase 3 in eigene Tabellen.
- **`queryKey` beginnt mit `companyId`**, damit ein Betriebswechsel nichts Fremdes aus
  dem Cache zeigt.
- **Kontakt-Löschprüfung zählt Angebote.** Sonst bietet die Kontaktseite „Löschen“ an,
  und erst der Fremdschlüssel lehnt ab.

## Fallstricke

- `quote_overview` liefert alle Spalten als nullable, weil es eine Sicht ist. `id` vor
  `routes.quote` prüfen.
- `save_quote_draft` erwartet `p_quote_id` NULL zum Anlegen; der Typgenerator macht daraus
  `string`. Der Aufruf castet, statt die erzeugte Datei von Hand zu ändern.
- `save_quote_draft` überschreibt alle Kopffelder, auch die, die der Editor nicht zeigt
  (`responsible_user_id`, `follow_up_on`). Der Editor lädt sie deshalb mit und gibt sie
  unverändert zurück.

## Auftragssumme aus Angeboten (2c)

Stand 2026-11-06, bautakt-app#188.

- Die Auftragssumme nie aus `orders.contract_sum` lesen, sondern über
  `useOrderContract` aus der Sicht `order_contract_totals`. Nach einer Annahme
  steht in der Spalte weiter die alte Summe von Hand.
- Die Sicht liefert nur mit `canViewOrderFinance` Zeilen. Ohne das Recht zeigt die
  Übersicht keine Auftragssumme mehr, die Finanzseite einen Hinweis. Früher sah jedes
  Mitglied die Summe (Risiko R6 im Umsetzungsplan).
- Die Summe in der Karte „Angebote und Nachträge“ ist der Angebotsbetrag der Version.
  Die Auftragssumme kann davon abweichen, weil bei der Annahme gewählte Alternativen
  und Bedarfspositionen mitzählen.
- Summe und Abrechnungsart sperrt die Datenbank nach der Annahme
  (`ORDER_CONTRACT_LOCKED`, `ORDER_BILLING_MODE_LOCKED`). Das Web bearbeitet beide
  Felder ohnehin nicht.
