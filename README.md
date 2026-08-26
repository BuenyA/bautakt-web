# bautakt-web

Monorepo für die Web-Seite von Bautakt.

| Workspace        | Zweck                                                | Domain            |
| ---------------- | ---------------------------------------------------- | ----------------- |
| `apps/marketing` | Marketing-Website (Next.js)                          | `bautakt.com`     |
| `apps/app`       | Web-Anwendung (Vite + React)                         | `app.bautakt.com` |
| `packages/*`     | Geteilte Pakete (Supabase-Types, UI-Tokens, Configs) | —                 |

Die React-Native-App und das Supabase-Backend liegen im separaten Repo `bautakt-app`.

## Entwicklung

Alle Befehle laufen aus der Repo-Wurzel:

```bash
npm install
npm run dev            # marketing :3000, app :5173
npm run dev:marketing
npm run dev:app
```

## Prüfen und Bauen

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Beide Apps werden aus diesem Repo als zwei getrennte Vercel-Projekte deployt
(Root Directory `apps/marketing` bzw. `apps/app`).

Agenten-Richtlinien stehen in [AGENTS.md](./AGENTS.md).
