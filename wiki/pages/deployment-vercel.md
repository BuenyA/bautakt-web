# Deployment auf Vercel

Zwei Vercel-Projekte aus **einem** Repo.

|                            | `bautakt-marketing`                                           | `bautakt-webapp`                        |
| -------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| Root Directory             | `apps/marketing`                                              | `apps/webapp`                           |
| Include files outside root | **an**                                                        | **an**                                  |
| Framework                  | Next.js                                                       | Vite                                    |
| Build Command              | `cd ../.. && npx turbo run build --filter=@bautakt/marketing` | dasselbe mit `--filter=@bautakt/webapp` |
| Output Directory           | (Standard)                                                    | `dist`                                  |
| Ignored Build Step         | `npx turbo-ignore @bautakt/marketing`                         | `npx turbo-ignore @bautakt/webapp`      |
| Domain                     | `bautakt.com` (+ `www`-Redirect)                              | `app.bautakt.com`                       |

„Include files outside root" ist **zwingend** — `packages/` liegt außerhalb der Root
Directory beider Projekte.

Das zweite Projekt heißt `bautakt-webapp`, nicht `bautakt-app`. Der Name gehört dem
Mobile-Repo, und die Verwechslung wäre dauerhaft.

## Der SPA-Rewrite ist nicht optional

⚠️ Ohne `apps/webapp/vercel.json` liefert jeder direkte Aufruf einer Unterroute in
Produktion einen 404. **Lokal fällt das nie auf** — der Vite-Dev-Server leitet ohnehin
alles auf `index.html`. Siehe [fallstricke.md](fallstricke.md).

`rewrites`, nicht `redirects`. Vercel liefert statische Dateien vor den Rewrites aus,
der Catch-all verdeckt `/assets/*` also nicht. Nicht mit einem Negative-Lookahead
„reparieren".

## Env-Präfixe

Dasselbe Wertepaar unter drei Namen:

| Wert             | `apps/marketing`                              | `apps/webapp`            | `bautakt-app`                   |
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

Ein fehlender, leerer oder unbrauchbarer Wert bricht den Build **nicht** ab — er fällt
auf den Standard zurück und schreibt bei einem unbrauchbaren Wert eine Warnung ins
Build-Log. Warum das nicht immer so war, steht in [fallstricke.md](fallstricke.md).

## Entwicklungsmodus: hosten, ohne öffentlich zu sein

Ein Vercel-Projekt zwingt zu keiner eigenen Domain. Ohne hinterlegte Custom Domain
läuft die Seite auf `<projekt>.vercel.app` — das reicht zum Entwickeln vollständig.

⚠️ **Ein Production-Deployment ist auch auf `.vercel.app` für Google erreichbar.**
Nur _Preview_-Deployments bekommen automatisch `X-Robots-Tag: noindex`. Ohne Vorkehrung
würde die Entwicklungsfassung mitsamt Platzhalter-Preisen indexiert und später mit der
echten Domain um dieselben Inhalte konkurrieren.

Zwei Ebenen, beide aktiv:

1. **Vercel → Settings → Deployment Protection → Vercel Authentication.** Sperrt das
   gesamte Deployment hinter den Vercel-Login. Die eigentliche Antwort auf „noch nicht
   öffentlich"; wirkt auch gegen alles, was keine Suchmaschine ist.
2. **Im Code.** `IS_PRODUCTION_SITE` in `apps/marketing/lib/site.ts` gibt nur dann frei,
   wenn `NEXT_PUBLIC_SITE_URL` **ausdrücklich** auf `bautakt.com` steht. Fehlend, leer,
   unlesbar oder fremde Domain heißt `Disallow: /` in der `robots.txt` **und**
   `noindex, nofollow` im Root-Layout. Beides zusammen, weil `Disallow` nur das Crawlen
   verhindert, nicht das Indexieren einer von woanders verlinkten URL.

Die Codeebene existiert, damit die Absicherung eine Änderung an den Projekteinstellungen
überlebt.

`NEXT_PUBLIC_SITE_URL` im Entwicklungsmodus trotzdem auf die `.vercel.app`-Adresse
setzen — sonst zeigen Canonical-Tags und Sitemap auf eine Domain, die nichts ausliefert.

### Go-live-Checkliste

⚠️ Die Kehrseite der Absicherung: **ohne gesetzte `NEXT_PUBLIC_SITE_URL` bleibt auch die
echte Seite auf `noindex`.** Beim Schalten auf die eigene Domain deshalb der Reihe nach:

1. Domain `bautakt.com` (+ `www`-Redirect) im Vercel-Projekt hinterlegen.
2. `NEXT_PUBLIC_SITE_URL` auf `https://bautakt.com` setzen.
3. **Redeploy** — Next ersetzt `NEXT_PUBLIC_*` zur Build-Zeit.
4. Deployment Protection abschalten.
5. `https://bautakt.com/robots.txt` aufrufen: dort muss `Allow: /` und der
   Sitemap-Verweis stehen. Steht da `Disallow: /`, hat Schritt 2 oder 3 gefehlt.
6. Im Quelltext der Startseite prüfen, dass **kein** `noindex` steht. Impressum,
   Datenschutz und AGB behalten ihr eigenes `noindex` — das ist Absicht.

Schritt 5 und 6 gegen das ausgelieferte Ergebnis prüfen, nicht gegen die Einstellung.

## Supabase Auth

URL Configuration muss enthalten:

- Site URL: `https://app.bautakt.com`
- Redirect-Allowlist: `https://app.bautakt.com/**`, `http://localhost:5173/**`,
  `https://bautakt-webapp-*.vercel.app/**`

⚠️ Beide Repos teilen dieses eine Projekt. Eine Änderung der Site URL wirkt in die
geteilten E-Mail-Templates, die die Mobile-App ebenfalls nutzt. Vorher die Templates
lesen — siehe [beziehung-zu-bautakt-app.md](beziehung-zu-bautakt-app.md).
