# @bautakt/marketing

Die Marketing-Website von Bautakt (`bautakt.com`). Next.js 16, App Router.

Alle Befehle laufen aus der **Repo-Wurzel**:

```bash
npm run dev:marketing   # http://localhost:3000
npm run build
```

Hinweise:

- Diese App hat bewusst **keinen Supabase-Client**. Auth lebt vollstaendig in
  `apps/webapp`. Ein spaeteres Kontaktformular laeuft ueber einen Route Handler mit
  serverseitigem Key, nie ueber den Browser.
- Jeder Link auf die Web-App laeuft ueber `lib/site.ts`.
- `typecheck` ist `next typegen && tsc --noEmit`. Next 16 injiziert Typen wie
  `LayoutProps` aus `.next/types`; ohne vorherigen typegen scheitert `tsc` auf
  einem frischen Clone.

Architektur und Regeln stehen in der [AGENTS.md](../../AGENTS.md) der Repo-Wurzel.
