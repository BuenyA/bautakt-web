# 2026-09-11 — Demo-GF-Lücken geschlossen

Die offenen Demo-Punkte vor dem GF-Termin 10.10.2026.

## Was geändert wurde

- **Kunden-Detail** (`/kunden/:id`): `CustomerDetailPage` + `useCustomer` analog zu
  Aufträgen; Listenzeilen verlinken; Stammdaten read-only: Anzeigename, Typ,
  Nummer, Adresse (Straße/PLZ/Ort/Land), E-Mail, Telefon, Notiz, Angelegt — ohne
  Billing-Felder und ohne Schreib-Buttons.
- **Einsätze Wochenfilter**: leere „Diese Woche“-Liste erklärt den Filter und bietet
  Wechsel zu „Alle“ (Default bleibt Alle).
- **Demo-Nav**: sichtbar nur Übersicht · Aufträge · Einsätze · Zeiten · Kunden.
  `/rechnungen` und `/einstellungen` bleiben Platzhalter-Routen, Legacy-Redirects
  unberührt.
- **Demo-Doku**: Klickpfad [demo-gf-2026-10-10.md](../pages/demo-gf-2026-10-10.md),
  Seed-SQL [`scripts/demo-seed-spahrbau-week.sql`](../../scripts/demo-seed-spahrbau-week.sql)
  schiebt Spahrbau-Assignments in die aktuelle Berlin-Woche und die GF-Woche.

## Warum

Wave 1/2 hatten Liste Kunden und Filter-Empty ohne Ausweg. Für die Demo müssen
Kunden-Detail und Wochenfilter-Empty ohne Sackgasse funktionieren; die SQL-Datei
macht die Wochenfilter-Daten ohne Schema-Seed reproduzierbar. Rechnungen und
Einstellungen lenken in der Demo ab und bleiben deshalb aus der Nav.

## Verweise

- Code: `apps/webapp/src/features/customers/`, `features/assignments/pages/AssignmentsListPage.tsx`,
  `components/layout/navItems.ts`
- [webapp-shell.md](../pages/webapp-shell.md)
