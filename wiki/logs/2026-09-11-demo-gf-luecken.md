# 2026-09-11 — Demo-GF-Lücken geschlossen

Die offenen Demo-Punkte vor dem GF-Termin 10.10.2026.

## Was geändert wurde

- **Kunden-Detail** (`/kunden/:id`): `CustomerDetailPage` + `useCustomer` analog zu
  Aufträgen; Listenzeilen verlinken; Stammdaten inkl. Adresse und Angelegt-Datum.
- **Einsätze Wochenfilter**: leere „Diese Woche“-Liste erklärt den Filter und bietet
  Wechsel zu „Alle“ (Default bleibt Alle).
- **Demo-Doku**: Klickpfad [demo-gf-2026-10-10.md](../pages/demo-gf-2026-10-10.md),
  Seed-SQL [`scripts/demo-seed-spahrbau-week.sql`](../../scripts/demo-seed-spahrbau-week.sql)
  schiebt Spahrbau-Assignments in die aktuelle Berlin-Woche und die GF-Woche.

## Warum

Wave 1/2 hatten Liste Kunden und Filter-Empty ohne Ausweg. Für die Demo müssen
Kunden-Detail und Wochenfilter-Empty ohne Sackgasse funktionieren; die SQL-Datei
macht die Wochenfilter-Daten ohne Schema-Seed reproduzierbar.

## Verweise

- Code: `apps/webapp/src/features/customers/`, `features/assignments/pages/AssignmentsListPage.tsx`
- [webapp-shell.md](../pages/webapp-shell.md)
