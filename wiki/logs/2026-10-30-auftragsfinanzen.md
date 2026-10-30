# 2026-10-30 Auftrag: Finanzen

Zweiter Schritt der neuen Auftragsseite (siehe
[auftragsseite.md](../pages/auftragsseite.md#finanzen)).

- Finanzkarte auf der Übersicht: Kosten und Abgerechnet als Leisten gegen
  die Auftragssumme, Kosten gelb ab 90 %, rot über 100 %.
- Reiter „Finanzen“ (`/auftraege/:id/finanzen`): Kennzahlen,
  Kostenaufteilung mit Kostenbelegen, Angebote und Rechnungen.
- `computeOrderFinance` in `@bautakt/finance` mit Tests.
- Rechte nach den Select-Policies (gemessen 2026-10-30); Lohn nur mit
  `canViewWageCosts`, sonst „Kosten ohne Lohn“.
- Bewusst anders als der App-Teaser: netto statt brutto bei den Einnahmen,
  Eingangsrechnungen am Auftrag zählen als Kosten.

Im Browser mit Testdaten geprüft (Desktop, 420 px, Warnstufe). Gegen echte
Daten nicht: Stand 2026-10-30 gibt es keine Verkaufsbelege und keine Kosten
mit `order_id`.
