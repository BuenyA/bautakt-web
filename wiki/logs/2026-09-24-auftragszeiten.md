# 2026-09-24 — Auftragszeiten nur lesend

Die Auftragsdetailseite zeigt die Zeiteinträge des Auftrags und verlinkt auf
die gefilterte Zeitenliste.

## Was geändert wurde

- `useTimeEntries` nimmt optional eine `order_id`. Der `queryKey` ist
  `['timeEntries', companyId, orderId ?? 'all']`, Sortierung `started_at`
  absteigend. Kein Insert, kein Update, kein Delete auf der Detailseite.
- `OrderTimes` hängt unter den Notizen: Laden, Fehler mit erneutem Versuch,
  leerer Hinweis, Karten mit Mitarbeiter, Zeitraum, Pause, Dauer und Notiz.
  „Alle Zeiten“ öffnet `/zeiten?order=<id>`.
- `/zeiten` liest denselben Parameter (`timesOrderParam`) und filtert die
  bestehende Liste. „Zum Auftrag“ und „Alle Aufträge“ heben den Kontext auf.
- Texte unter `domain:orders.times` und `domain:times`.

## Warum

Geschäftsführung sieht am Schreibtisch, welche Zeiten an diesem Auftrag hängen,
ohne die Betriebsliste von Hand zu durchsuchen und ohne eine zweite
Schreibstelle neben `/zeiten` und der Handy-App.

## Verweise

- Code: `apps/webapp/src/features/orders/OrderTimes.tsx`,
  `apps/webapp/src/features/times/useTimeEntries.ts`,
  `apps/webapp/src/features/times/pages/TimesListPage.tsx`
- [auftragszeiten.md](../pages/auftragszeiten.md)
