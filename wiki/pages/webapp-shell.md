# Webapp-Shell und Navigation

Wie die angemeldete Oberfläche in `apps/webapp` aufgebaut ist und welche
Informationsarchitektur gilt. Stand Wave 1 (2026-09-07).

## Layout

Desktop: Sidebar (~240px, `w-60`) links, Topbar (~56px, `h-14`) darüber, Main
rechts. Mobile: Drawer über denselben Sidebar-Inhalt, Topbar mit Menü-Button und
Signet.

Logo-Lockup oben in der Sidebar (`BautaktLogo` / `BautaktSignet`), Farbe über
`currentColor` / `--foreground`. Abmelden und Nutzerkennung unten in der Sidebar.
Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.

Listen-Seiten nutzen `PageHeader` und bei leeren Ergebnissen `EmptyState`.

## Kanonische Top-Nav IA

1. Übersicht (`/uebersicht`)
2. Aufträge (`/auftraege`) — Angebote als Tab/Filter `?status=quote`, nicht top-level
3. Einsätze (`/einsaetze`) — Kalender später darunter, nicht top-level
4. Zeiten (`/zeiten`)
5. Rechnungen (`/rechnungen`)
6. Kunden (`/kunden`)
7. Einstellungen (`/einstellungen`) — Mitarbeiter/Rollen/Einladungen darunter

Keine Slash-Doppel-Labels. Alte Pfade (`/mitarbeiter`, `/finanzen`, `/kalender`,
`/benachrichtigungen`) redirecten auf die neuen Ziele.

## Tokens

Shell nutzt die bestehenden `@bautakt/ui`-Tokens (Mobile-Port, Primary `#0a66c2`).
`--sidebar` ist nur ein Alias auf `--background-second`, kein neues Primär.

## Datenabfragen

`useOrders` / `useOrder` / `useCustomers` / `useAssignments` / `useAssignment` /
`useTimeEntries` starten den `queryKey` mit `companyId`. UI-Gating bleibt Führung;
RLS bleibt die Grenze.

Einsätze und Zeiten sind read-first (Liste; Einsätze zusätzlich Detail). Schreib-
Flows und Kalender-Grid fehlen bewusst. `calendar_events` sind nicht in der
Einsatzliste — eigene Tabelle, anderer Zuschnitt.
