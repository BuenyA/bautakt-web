# 2026-08-27 — `apps/app` heißt jetzt `apps/webapp`

Auf Wunsch des Repo-Eigentümers, noch vor dem Merge des Fundament-PRs.

## Warum

`app` war zweideutig: `bautakt-app` ist bereits der Name des Mobile-Repos
(React Native, Android und iOS). Ein Ordner `apps/app` in diesem Repo suggeriert
„die App", obwohl gemeint ist „die Web-Anwendung". `webapp` benennt das eindeutig.

## Was sich ändert

- `apps/app` → `apps/webapp` (per `git mv`).
- Paketname `@bautakt/app` → `@bautakt/webapp`.
- Root-Script `dev:app` → `dev:webapp`.
- Geplanter Vercel-Projektname `bautakt-app-web` → `bautakt-webapp` — parallel zu
  `bautakt-marketing` benannt, nicht `bautakt-web-webapp`. Ein Name mit „web" zweimal
  drin wurde bewusst verworfen.
- Alle Verweise in `AGENTS.md`, `README.md` und den betroffenen Wiki-Seiten
  (`architektur.md`, `auth-web.md`, `deployment-vercel.md`, `fallstricke.md`)
  nachgezogen.

Der historische Log-Eintrag [2026-08-26-monorepo-fundament.md](2026-08-26-monorepo-fundament.md)
bleibt unverändert stehen — er beschreibt zutreffend, was an dem Tag geschah
(`apps/web` → `apps/app`). Diese zweite Umbenennung ist ein eigener Schritt.

## Verifiziert

- `npm install` nach dem Rename lief sauber durch, das Lockfile spiegelt
  `apps/webapp` und `@bautakt/webapp`.
- `npm run check && npm run build` grün.
- Kein Vercel-Projekt existierte zu diesem Zeitpunkt — der Rename hatte also keine
  Live-Deployment-Konsequenz.
