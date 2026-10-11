# 2026-10-11 — Neue Übersicht

## Was geändert wurde

Die Startseite zeigt jetzt den Tag (Einsätze mit Team-Bildern, Termine,
Abwesende), „Zu erledigen“ (Anträge mit Genehmigen, neue Eingangsrechnungen,
Fristen, Überfälliges) und die Jahreszahlen netto inklusive Lohnkosten.
Details: [Übersicht](../pages/uebersicht.md).

- `@bautakt/finance`: `computeYearResult`, `laborCostMinor`, `resolveCostRate` mit Tests.
- `features/overview/today.ts`: Serienregeln, Spalten für Überlappungen,
  „neu seit“, Fristen — mit `node --test`.
- `useIncomingInvoiceList` liefert zusätzlich `created_at`.

## Warum

Die alte Übersicht zeigte vier Geld-Kacheln und war ohne Finanzrecht leer. Der
Owner wollte auf einen Blick sehen, was heute ansteht und wie der Betrieb steht.

## Entscheidungen des Owners

Layout „Heute zuerst“; Ergebnis netto inklusive Lohnkosten.
