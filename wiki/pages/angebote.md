# Angebote

Neuer Angebotsbereich, Umsetzungsplan in `bautakt-app` unter
`documentation/angebote/umsetzungsplan.md`, Datenmodell und Rechte im Wiki der App
(`wiki/pages/angebote.md`). Hier steht nur, was das Web betrifft.

## Stand

- **1b Liste und Detailseite** (web#291): `/angebote/vorgaenge` und
  `/angebote/vorgaenge/:id`, beide hinter `canViewQuotes`. Bis 1c nicht verlinkt; die alte
  Liste `/angebote` aus `sales_documents` bleibt solange bestehen.

## Warum so

- **Status kommt vom Server.** `quote_overview` rechnet Entwurf, offen, abgelaufen und die
  Entscheidung, Stichtag Berliner Zeit. Die Web-App filtert nur. Eine zweite Statuslogik
  im Client liefe beim ersten Sonderfall auseinander.
- **Euro-Summen ohne Franken.** Die Kennzahlen zählen CHF-Angebote mit, rechnen sie aber
  nicht in die Euro-Summe. Ein Hinweis erscheint, sobald das passiert.
- **Kunde über `quotes`, nicht über die Sicht.** `quote_overview` hat keine Beziehung zu
  `customer_profiles`. Der Name kommt aus einer zweiten Abfrage auf `quotes`. Sieht ein
  Nutzer den Kontakt per RLS nicht, bleibt die Spalte leer statt eines Fehlers.
- **Kein Kalkulationsfeld im Web-Abruf.** Liste und Detail lesen nur Spalten ohne Kosten
  und Marge, auch die CSV. Positionen und Kalkulation folgen in 1c.
- **`queryKey` beginnt mit `companyId`**, damit ein Betriebswechsel nichts Fremdes aus
  dem Cache zeigt.
- **Kontakt-Löschprüfung zählt Angebote.** Sonst bietet die Kontaktseite „Löschen“ an,
  und erst der Fremdschlüssel lehnt ab.

## Fallstricke

- `quote_overview` liefert alle Spalten als nullable, weil es eine Sicht ist. `id` vor
  `routes.quoteWorkspaceDetail` prüfen.
- Die Typen in `packages/supabase/src/database.types.ts` müssen nach der Migration
  `ang_quotes_core` aus Production neu erzeugt werden.
