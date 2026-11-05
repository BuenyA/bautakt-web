# Bestätigungsmail deutsch, persönliche E-Mail bei der Registrierung

2026-11-05. Zwei kleine Änderungen zu
[bautakt-web#141](https://github.com/BuenyA/bautakt-web/issues/141), ohne die
Mobile-App und ohne Dashboard-Schreibzugriff.

Die Confirm-signup-Mail im gehosteten Projekt ist der englische Standard von
Supabase („Follow this link to confirm your user“). Dieses Repo hat kein
`supabase/config.toml`. Laut Owner-Kommentar vom 03.11.2026 liegt der
Auth-Mail-Code in `bautakt-app` (`supabase/templates/`, Upload per Skript mit
`SUPABASE_ACCESS_TOKEN`) und ist nicht in Production. Die deutsche Vorlage
steht deshalb hier unter `supabase/templates/` (`confirm-signup.html`,
Betreff in `confirm-signup.subject.txt`). Der Owner fügt sie im Dashboard unter
Authentication > Email Templates ein. Der Link bleibt `{{ .ConfirmationURL }}`:
`signUp` leitet nach `/login`, `detectSessionInUrl` löst die Sitzung ein. Es
gibt keine Confirm-Route, also keinen `token_hash`-Link.

`/registrieren` beschriftet das Adressfeld mit „Persönliche E-Mail-Adresse“
und öffnet die Erklärung über das bestehende `HelpButton`. Anmeldung und
Passwort vergessen behalten „E-Mail“. Die Anmeldekarte bleibt dunkel.
