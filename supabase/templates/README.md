# Auth-Mail: Confirm signup

Deutsche Vorlage für die Supabase-Auth-Mail „Confirm signup“. Absender, den der
Owner im Dashboard einträgt: **Bautakt** `<noreply@bautakt.com>`. Die App ist
`app.bautakt.com`.

| Datei                        | Inhalt              |
| ---------------------------- | ------------------- |
| `confirm-signup.subject.txt` | Betreff, eine Zeile |
| `confirm-signup.html`        | HTML-Text der Mail  |

Der Link ist `{{ .ConfirmationURL }}`. Die Web-App hat keine eigene
Bestätigungsroute. `signUp` setzt `emailRedirectTo` auf
`${window.location.origin}/login` (`AuthProvider.tsx`), der Client löst die
Sitzung mit `detectSessionInUrl: true` und `flowType: 'pkce'` ein
(`packages/supabase/src/client.ts`). Ein selbst gebauter `token_hash`-Link
würde diese Weiterleitung umgehen.

## Wo die Vorlage liegt

In diesem Repo gibt es kein `supabase/config.toml`. `/supabase/*` ist
Scratch-State der CLI und ignoriert, ausser Migrationen und diesem Ordner.

Laut Kommentar vom 03.11.2026 auf
[bautakt-web#141](https://github.com/BuenyA/bautakt-web/issues/141) liegt der
Code der Auth-Mails auf `main` von `bautakt-app` (Pull Request 157), inklusive
`supabase/templates/README.md`. Die Übertragung ins gehostete Projekt ist dort
noch offen und braucht ein `SUPABASE_ACCESS_TOKEN`. Production ändert sich
dadurch nicht: im Dashboard steht weiter der englische Standardtext
(„Follow this link to confirm your user“). Dieses Workspace kann
`bautakt-app` nicht lesen. Die Mobile-App wird hier nicht geändert.

## Manueller Schritt im Dashboard

Diese Dateien werden **nicht** automatisch aktiv. Der Owner fügt sie selbst ein
unter **Supabase Dashboard > Authentication > Emails > Templates > Confirm signup**
(im Menü auch „Auth > Email Templates“):

1. Betreff aus `confirm-signup.subject.txt` einsetzen.
2. Den Inhalt von `confirm-signup.html` als Nachricht einsetzen.
3. Absendername `Bautakt`, Adresse `noreply@bautakt.com` prüfen. Das ist eine
   Dashboard-Einstellung und gehört nicht in die HTML-Datei.

Kein Aufruf der Management API und keine Änderung an den Projekteinstellungen
aus diesem Repo.

Wenn später das Skript aus `bautakt-app` die Vorlagen hochlädt, überschreibt es
den Dashboard-Text. Die deutsche Fassung muss dann auch dort stehen, sonst ist
die englische oder eine ältere Vorlage wieder live.
