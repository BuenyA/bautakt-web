# 2026-09-07 — Wave 1: Shell, Aufträge, Kunden

Wave 1 der Webapp-Oberfläche.

## Was geändert wurde

- Shell: Sidebar + Topbar + Mobile-Drawer, Logo-Lockup, Abmelden in der Sidebar,
  Benachrichtigungen als Topbar-Glocke.
- Nav-IA auf die sieben kanonischen Einträge umgestellt; Platzhalter für
  Übersicht/Einsätze/Zeiten/Rechnungen/Einstellungen.
- Aufträge: Live-Liste und Detail gegen Supabase (`orders`), Filter „Angebote“.
- Kunden: Live-Liste gegen Supabase (`customers`), EmptyState.
- `--sidebar` als Alias auf bestehende Fläche in `@bautakt/ui`; Primary unverändert
  (Teamleiter: Mobile-Palette behalten, nicht Marketing `#3B86E0`).

## Warum

Die Webapp hatte nur Platzhalter und eine veraltete Nav (Mitarbeiter/Finanzen/
Kalender top-level). Wave 1 liefert die IA und die ersten echten Listen, ohne die
Token-Entscheidung der Mobile-App zu kippen.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- Code: `apps/webapp/src/components/layout/`, `features/orders/`, `features/customers/`
