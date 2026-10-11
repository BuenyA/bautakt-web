# Mitarbeiterseite

`/mitarbeiter/:id` (`EmployeeDetailPage`), seit 2026-10-11. Ein Klick auf eine
Zeile im Mitarbeiterverzeichnis führt hierher; vorher öffnete er nur das
Bearbeiten-Panel. Recht wie das Verzeichnis: `canManageEmployees`.

## Inhalt

- **Kopf:** Name, „Bearbeiten“ öffnet `EmployeeSheet` wie bisher die Liste.
  Ausgeschiedene tragen „Ausgeschieden“.
- **Stammdaten:** Rolle, Tätigkeit, E-Mail, Telefon, Seit (und Bis).
- **Zeiten** (`EmployeeTimes`): Zeitraum Heute/Woche/Monat (`?period=`, Default
  Woche, `timePeriod.ts`), „Summe: 8:00 Std.“ für den Zeitraum und die Tabelle
  (`useTimeColumns`: Auftrag mit „Abgerechnet“, Beginn, Ende, Pause, Dauer,
  Notiz). „Zeit nachtragen“ belegt den Mitarbeiter vor, eine Zeile öffnet das
  Panel, wenn `canEditTimeEntry` es erlaubt.

## Warum so

Der Owner wollte keinen eigenen Bereich „Zeiten“ mehr: Zeiten gehören zum
Auftrag (wer hat wie viel gearbeitet, [auftragszeiten.md](auftragszeiten.md))
oder zum Mitarbeiter.

⚠️ Der Abschnitt Zeiten erscheint nur mit `canTrackTimeForTeam`,
`canViewCompanyFinance` oder `canViewWageCosts`. Ohne diese Rechte liefert RLS
nur eigene Zeilen; eine leere Tabelle bei einem anderen Mitarbeiter sähe aus
wie „hat nichts gearbeitet“ und wäre eine Falschaussage.

Die Daten kommen aus `useEmployees` (derselbe Cache wie das Verzeichnis), eine
eigene Einzelabfrage gibt es nicht.
