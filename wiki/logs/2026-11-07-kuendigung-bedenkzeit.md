# 07.11.2026: Kündigung mit 7 Tagen Bedenkzeit (Löschkonzept WP6)

**Was:** Die Seite „Unternehmen kündigen“ (`/unternehmen/loeschen`) stellt den Antrag jetzt selbst, statt eine Mail an den Support zu öffnen. Schema und Regeln: [bautakt-app, loeschkonzept.md#kündigung-mit-7-tagen-bedenkzeit-wp6](https://github.com/BuenyA/bautakt-app/blob/main/wiki/pages/loeschkonzept.md#k%C3%BCndigung-mit-7-tagen-bedenkzeit-wp6).

- **Antrag:** Export-Hinweis mit Link zum Datenexport, Haken „gelesen“, Passwort. Die Seite meldet sich mit dem Passwort neu an (`signIn` aus `useAuth`) und ruft danach `request_company_termination`. Die Datenbank prüft am Token (Claim `amr`), dass die Passwort-Anmeldung höchstens 10 Minuten alt ist; das Passwort geht nie an die RPC. Vertragsende ist heute + 7 Tage.
- **Bedenkzeit:** Jeder Inhaber sieht über jeder Seite einen Hinweis mit Vertragsende und Widerrufsfrist (`CompanyReadOnlyBanner`, neuer Zustand `terminating` in `lifecycle.ts`). Auf der Seite steht der Knopf „Kündigung widerrufen“ (`revoke_company_termination`) bis zum Vortag des Vertragsendes. Mitarbeitende sehen nichts, sie arbeiten bis zum Vertragsende normal weiter.
- **Nach dem Vertragsende** zeigt die Seite nur noch den Hinweis auf den Export.
- Logik in `features/companySettings/termination.ts` (getestet), Mutationen in `useCompanyTermination.ts`. Fehlercodes der RPCs (`COMPANY_TERMINATION_*`) übersetzt `terminationErrorKey`.

**Warum so:** Die Prüfungen (nur Inhaber, Passwort frisch, Hinweis bestätigt, Widerruf nur bis E - 1) sitzen in der Datenbank. Die Seite führt nur. Kein Passwort-Feld an der RPC, damit es in keinem Log der Datenbank landen kann.

**Geprüft:** Echter Ablauf im Testbetrieb mit Playwright (`~/.cache/bautakt-shotwp6.mjs` auf dem Rechner von Instanz B), hell und dunkel: Knopf ohne Haken gesperrt, falsches Passwort abgelehnt, Antrag, Hinweis, Widerruf; danach war der Betrieb wieder `active`. Screenshots zeigen nur den Inhaltsbereich, ohne die Mail des Testkontos.

**Nebenbei:** Typen neu erzeugt. Dabei kamen auch die Beziehungen der Sicht `order_contract_totals` (Angebote 2c) und die Job-Funktionen aus WP4/WP5 dazu, die bisher fehlten.
