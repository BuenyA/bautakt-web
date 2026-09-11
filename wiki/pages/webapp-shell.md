# Webapp-Shell und Navigation

Wie die angemeldete Oberfläche in `apps/webapp` aufgebaut ist und welche
Informationsarchitektur gilt. Stand Demo-GF Spec-Delta (2026-09-11): sichtbare
Nav ohne Rechnungen/Einstellungen; Kunden-Detail read-first mit Stammdaten inkl.
Typ und Notiz.

## Layout

Desktop: Sidebar (~240px, `w-60`) links, Topbar (~56px, `h-14`) darüber, Main
rechts. Mobile: Drawer über denselben Sidebar-Inhalt, Topbar mit Menü-Button und
Signet.

Logo-Lockup oben in der Sidebar (`BautaktLogo` / `BautaktSignet`), Farbe über
`currentColor` / `--foreground`. Abmelden und Nutzerkennung unten in der Sidebar.
Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.

Listen-Seiten nutzen `PageHeader` und bei leeren Ergebnissen `EmptyState` — ohne
„Neu anlegen“-CTAs in den Demo-Views.

## Sichtbare Top-Nav (Demo GF)

1. Übersicht (`/uebersicht`) — HOME, Platzhalter (`comingSoon`), keine Fake-KPIs
2. Aufträge (`/auftraege`) — Angebote als Tab/Filter `?status=quote`, nicht top-level
3. Einsätze (`/einsaetze`) — Kalender später darunter, nicht top-level
4. Zeiten (`/zeiten`)
5. Kunden (`/kunden`) — Liste + Detail

Rechnungen (`/rechnungen`) und Einstellungen (`/einstellungen`) bleiben als
Platzhalter-Routen erreichbar, erscheinen aber **nicht** in der Nav. Alte Pfade
(`/mitarbeiter`, `/finanzen`, `/kalender`, `/benachrichtigungen`) redirecten
unverändert.

## Tokens

Shell nutzt die bestehenden `@bautakt/ui`-Tokens (Mobile-Port, Primary `#0a66c2`).
`--sidebar` ist nur ein Alias auf `--background-second`, kein neues Primär.

## Datenabfragen

`useOrders` / `useOrder` / `useCustomers` / `useCustomer` / `useAssignments` /
`useAssignment` / `useTimeEntries` starten den `queryKey` mit `companyId`.
UI-Gating bleibt Führung; RLS bleibt die Grenze.

Aufträge, Einsätze und Kunden sind read-first (Liste + Detail). Zeiten nur Liste.
Schreib-Flows und Kalender-Grid fehlen bewusst. `calendar_events` sind nicht in
der Einsatzliste — eigene Tabelle, anderer Zuschnitt.

Demo-Klickpfad: [demo-gf-2026-10-10.md](demo-gf-2026-10-10.md).
