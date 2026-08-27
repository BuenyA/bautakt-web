# Deployment auf Vercel

Zwei Vercel-Projekte aus **einem** Repo.

|                            | `bautakt-marketing`                                           | `bautakt-app-web`                    |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Root Directory             | `apps/marketing`                                              | `apps/app`                           |
| Include files outside root | **an**                                                        | **an**                               |
| Framework                  | Next.js                                                       | Vite                                 |
| Build Command              | `cd ../.. && npx turbo run build --filter=@bautakt/marketing` | dasselbe mit `--filter=@bautakt/app` |
| Output Directory           | (Standard)                                                    | `dist`                               |
| Ignored Build Step         | `npx turbo-ignore @bautakt/marketing`                         | `npx turbo-ignore @bautakt/app`      |
| Domain                     | `bautakt.com` (+ `www`-Redirect)                              | `app.bautakt.com`                    |

„Include files outside root" ist **zwingend** — `packages/` liegt außerhalb der Root
Directory beider Projekte.

Das zweite Projekt heißt `bautakt-app-web`, nicht `bautakt-app`. Der Name gehört dem
Mobile-Repo, und die Verwechslung wäre dauerhaft.

## Der SPA-Rewrite ist nicht optional

⚠️ Ohne `apps/app/vercel.json` liefert jeder direkte Aufruf einer Unterroute in
Produktion einen 404. **Lokal fällt das nie auf** — der Vite-Dev-Server leitet ohnehin
alles auf `index.html`. Siehe [fallstricke.md](fallstricke.md).

`rewrites`, nicht `redirects`. Vercel liefert statische Dateien vor den Rewrites aus,
der Catch-all verdeckt `/assets/*` also nicht. Nicht mit einem Negative-Lookahead
„reparieren".

## Env-Präfixe

Dasselbe Wertepaar unter drei Namen:

| Wert             | `apps/marketing`                              | `apps/app`               | `bautakt-app`                   |
| ---------------- | --------------------------------------------- | ------------------------ | ------------------------------- |
| Supabase URL     | _(nicht gesetzt)_                             | `VITE_SUPABASE_URL`      | `EXPO_PUBLIC_SUPABASE_URL`      |
| Öffentlicher Key | _(nicht gesetzt)_                             | `VITE_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Adressen         | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | —                        | —                               |

Marketing hat bewusst keinen Supabase-Client. In der Tabelle steht es trotzdem, damit
niemand die Variablen ins falsche Projekt legt.

⚠️ Vite ersetzt `VITE_*` zur **Build**-Zeit. Eine Wertänderung in Vercel braucht ein
Redeploy, keinen Neustart.

`NEXT_PUBLIC_APP_URL` in Preview-Deployments auf die Preview-App zeigen lassen, sonst
verlinken Previews in die Produktion.

## Supabase Auth

URL Configuration muss enthalten:

- Site URL: `https://app.bautakt.com`
- Redirect-Allowlist: `https://app.bautakt.com/**`, `http://localhost:5173/**`,
  `https://bautakt-app-web-*.vercel.app/**`

⚠️ Beide Repos teilen dieses eine Projekt. Eine Änderung der Site URL wirkt in die
geteilten E-Mail-Templates, die die Mobile-App ebenfalls nutzt. Vorher die Templates
lesen — siehe [beziehung-zu-bautakt-app.md](beziehung-zu-bautakt-app.md).
