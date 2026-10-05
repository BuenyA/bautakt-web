# Kostenstellen

`/kostenstellen` listet die Kostenstellen des Betriebs, legt sie an und löscht
sie, solange kein Auftrag darauf zeigt. Die Seite bleibt hinter
`canManageCostCenters` (`RequirePermission`). Das blendet die Seite aus und ist
keine Kontrolle.

## Anlegen

Ein Seitenpanel, Knopf „Kostenstelle anlegen“ (`CostCenterSheet`). Das Panel
ist nur gemountet, solange es offen ist, und startet deshalb jedes Mal leer.

Pflicht laut Schema, Stand 2026-10-05: `id`, `company_id`, `code`, `name`.
`cost_centers.id` hat kein `DEFAULT gen_random_uuid()` — der Client setzt
`crypto.randomUUID()` ([fallstricke.md](fallstricke.md)).

Die Nummer ist je Betrieb eindeutig, ohne Rücksicht auf Großschreibung
(`cost_centers_company_code_unique` auf `(company_id, lower(code))`). Eine
Nummer oder Bezeichnung aus nur Leerzeichen lehnt das Formular ab — dieselbe
Ausnahme wie beim Auftrag, weil die Zeile sonst in der Liste nicht
wiederzufinden ist. Die Spalten selbst nähmen den leeren Text an.

Lehnt die Datenbank ab, zeigt das Formular „Dafür fehlt dir die Berechtigung.“
(`readableDbError`, Postgres `42501`) oder, bei der Nummer, „Diese Nummer gibt
es in diesem Betrieb schon.“ (`23505`).

Insert-Policy: `has_company_permission(company_id, 'canManageCostCenters')`
oder `is_company_chef(company_id)`. Welches Recht welche Rolle trägt, steht im
Wiki von `bautakt-app`:
<https://github.com/BuenyA/craft/blob/main/wiki/pages/berechtigungen-und-rollen.md>.

## Statistik

Keine eigene Buchungsspalte auf `cost_centers`. „Gebucht“ meint im übrigen
Produkt eine erfasste Zahlung (`payments`, „Zahlung gebucht“) oder eine
nicht-kalkulatorische Ausgabe. Beides hängt nicht an der Kostenstelle.
Zahlungen, Ausgaben und Zeiteinträge sind außerdem nur mit Finanz-, Lohn- oder
Teamsicht lesbar. `canManageCostCenters` schließt das nicht ein; eine Summe
darüber wäre für manche Nutzer still unvollständig.

Die Liste zeigt deshalb zwei Kennzahlen aus `orders`, die jedes
Betriebsmitglied lesen darf:

- **Aufträge** — Anzahl der Zeilen mit dieser `cost_center_id`. Angebote und
  abgelehnte Angebote liegen in derselben Tabelle und zählen mit. Dieselbe
  Menge sperrt das Löschen.
- **Auftragssumme** — Summe der hinterlegten `contract_sum`. `null` zählt nicht
  mit. Ist an keinem verknüpften Auftrag eine Summe gesetzt, steht ein Strich
  („Noch keine Auftragssumme hinterlegt.“), nicht 0,00 €. Eine echte 0 bleibt
  0,00 €.

Gemessen 2026-10-05: 5 Kostenstellen, 5 verknüpfte Aufträge (4 `active`,
1 `finished`), `contract_sum` überall `null`. Der Strich ist dieser Datenstand,
kein Ladefehler.

Die beiden Abfragen filtern auf `company_id`. Der `queryKey` bleibt
`['cost-centers', companyId]`.

## Löschen

`orders.cost_center_id` ist `ON DELETE SET NULL` (Stand 2026-10-05). Ein
Löschen würde die Zuordnung still lösen und `cost_center_label` stehen lassen.
Hängt mindestens ein Auftrag daran, erklärt der Dialog das und löscht nicht.

Die Zählung läuft unmittelbar vor dem `delete` noch einmal. Kommt dazwischen
ein Auftrag dazu, wird der Dialog zur Sperre und die Liste neu geladen. Ein
Auftrag, der nach der Zählung und vor dem `delete` verknüpft wird, kann
trotzdem genullt werden — das schlösse erst `ON DELETE RESTRICT` in
`bautakt-app`, und das ist hier bewusst keine Migration.

Ein Delete, das keine Zeile zurückgibt, gilt als fehlgeschlagen. RLS meldet
ein verweigertes Delete oft als Erfolg ohne Zeile. Die Delete-Policy ist
dieselbe Berechtigung wie beim Anlegen.

## Code

- `apps/webapp/src/features/masterdata/pages/CostCentersPage.tsx`
- `apps/webapp/src/features/masterdata/CostCenterSheet.tsx`
- `apps/webapp/src/features/masterdata/useCostCenterMutations.ts`
- `apps/webapp/src/features/masterdata/costCenterStats.ts`
- `apps/webapp/src/features/masterdata/useMasterData.ts`
