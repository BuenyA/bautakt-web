# 2026-08-26 — Fundament des Monorepos

Ausgangslage: `bautakt-web` bestand aus zwei Scaffolds, die ein GitHub-Copilot-Agent auf
einem Linux-Runner erzeugt hatte. Eine Next-Seite mit einem Hero, eine Vite-App mit
einem Login-Formular, das nur einen Statustext setzte. Kein Supabase, kein Styling, kein
Routing, kein Env-Handling, keine Vercel-Konfiguration, keine Agenten-Dokumentation.

Ziel dieser Sitzung war ein tragfähiges Fundament, keine Features.

## Was gemacht wurde

- **Hygiene.** Eine einzige `.gitignore` im Root, `apps/web` zu `apps/app` umbenannt,
  zwei verwaiste Lockfiles entfernt, TypeScript von 5.9/6.0 auf 5.9.3 vereinheitlicht,
  oxlint zugunsten von ESLint entfernt, `strict` in `apps/app` ergänzt.
- **Turborepo** über die bestehenden npm-Workspaces, dazu `@bautakt/tsconfig` und
  `@bautakt/eslint-config`, Prettier und erzwungene Import-Sortierung.
- **`@bautakt/supabase`** mit generierten Types über alle 49 Tabellen.
- **`@bautakt/core`** mit den 33 Permissions, den sieben Systemrollen und einem
  Drift-Check gegen die Datenbank.
- **`@bautakt/ui`** mit Tailwind v4, den aus der Mobile-App portierten Tokens und
  shadcn-Primitives.
- **Marketing-Seite** mit acht Routen, Sitemap, robots.txt und Rechtsgerüst.
- **Web-App** mit React Router, Auth gegen Supabase, App-Shell und Rechte-Gating.
- **Vercel-Konfiguration**, `AGENTS.md` und dieses Wiki.

## Was dabei tatsächlich schiefging

Vier Dinge, die nicht Theorie waren und in [fallstricke.md](../pages/fallstricke.md)
stehen:

1. **Das Lockfile vom Linux-Runner** ließ auf dieser ARM-Windows-Maschine das
   rolldown-Binding fehlen. Der Build brach ab. Neu erzeugt.
2. **`.env` war nicht ignoriert.** Und die Negation `!.env.example` im Root half für
   `apps/marketing/` nicht, weil dort eine eigene `.gitignore` mit `.env*` lag und
   gewann. Erst der empirische Test — Dateien anlegen und `git status --ignored` lesen —
   zeigte das; `git check-ignore -v` liefert auch bei Negations-Treffern Exit 0 und sah
   aus wie Bestätigung.
3. **Die Supabase-CLI legte ein `supabase/` im Repo-Root an** und es war bereits
   committet. Entfernt, Pfad gesperrt.
4. **`employments.company_id`, `.role` und `.user_id` sind nullable.** Der Compiler hat
   das gefangen, als `useMembership` entstand. Ohne generierte Types wäre es
   durchgerutscht — die Mobile-App typt diese Zeilen von Hand.

## Bewusste Abweichungen von bautakt-app

Jeweils mit Grund, ausführlich in [architektur.md](../pages/architektur.md) und
[auth-web.md](../pages/auth-web.md):

- `onAuthStateChange` statt einmaligem Lesen der Sitzung beim Mount.
- TanStack Query statt Cache-plus-Outbox — die Web-App ist online-first.
- Feature-first statt layer-first.
- Prettier und erzwungene Import-Sortierung, die es dort bewusst nicht gibt.

## Wie verifiziert wurde

Nicht gegen die Konfiguration, sondern gegen das Ergebnis:

- Turbo-Caching: zweiter Build meldet `FULL TURBO`, 10 s auf 57 ms.
- Supabase-Types: `Tables<'orders'>` löst auf, `Tables<'gibt_es_nicht'>` wird vom
  Compiler abgewiesen.
- Permissions: SQL gegen `system_role_templates` — 33 in der DB, 33 im Code, keine
  Abweichung.
- Design-Tokens: `--primary` steht im gebauten CSS beider Apps, in Light und Dark.
- Marketing-CTAs: im gebauten HTML zeigen alle auf `app.bautakt.com`, und außerhalb von
  `lib/site.ts` kommt die Domain nirgends vor.
- Auth: am laufenden Server im Browser. `/auftraege` leitet ohne Sitzung auf `/login`,
  falsche Zugangsdaten liefern „E-Mail oder Passwort stimmt nicht." — das beweist
  Client-Initialisierung, Erreichbarkeit, Fehler-Mapping und i18n in einem Zug.

## Was offen ist

- **Anmeldung mit einem echten Konto: funktioniert** (vom Repo-Eigentümer bestätigt,
  2026-08-26). Damit sind Client, Sitzung und der Weg in die App-Shell belegt.
  Weiterhin ungetestet und einzeln nachzuholen: die Sidebar-Filterung nach Rechten,
  der Hard-Reload-Test auf `initializing` und der Nutzerwechsel-Test auf
  `queryClient.clear()` — Letzterer braucht zwei Konten im selben Browser.
- **Passwort-Reset per Mail** ungetestet, solange die Redirect-Allowlist in Supabase
  nicht gesetzt ist.
- **Vercel-Projekte** sind noch nicht angelegt. Damit auch der SPA-Rewrite ungetestet —
  er scheitert ausschließlich in Produktion.
- **Preise** auf der Marketing-Seite sind Platzhalter, **Rechtstexte** sind Gerüste mit
  `robots: index false`.
- Das JS-Bundle der App liegt bei rund 690 kB (203 kB gzip) ohne Code-Splitting.
