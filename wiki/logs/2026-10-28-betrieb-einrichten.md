# Betrieb einrichten nach der Anmeldung

2026-10-28. Ein angemeldeter Nutzer ohne Beschäftigung hatte keinen Weg weiter:
`ProtectedRoute` prüft nur die Sitzung, `useMembership` liefert dann `null`,
die Shell bleibt leer.

`/betrieb-einrichten` übernimmt den Chef-Zweig der Mobile-App (Name, Gewerk,
Teamgröße) und legt die Firma mit denselben Supabase-Aufrufen an wie
`createCompany` plus `createCompanyFromDraft`. Adresse und Kontakt bleiben
leer, das Land ist `DE`, die Rolle ist `Geschäftsführer`. Die Seed-RPCs ruft
die Oberfläche nicht auf; das tun die Trigger auf `companies`.

`/registrieren` bleibt bei E-Mail und Passwort. Profilfoto, Einladung und QR
fehlen bewusst. `profiles.onboarding_complete` wird nach der Anlage gesetzt,
weil die App das vor dem Einstieg in die Hauptansicht tut.

Warum ein Gate und keine Prüfung in der Shell: ohne Beschäftigung darf keine
geschützte Route Daten laden, auch nicht die Druckansicht.
