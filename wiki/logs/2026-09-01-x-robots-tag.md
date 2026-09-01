# 2026-09-01 — X-Robots-Tag auf Marketing-Production

## Was

Marketing setzt außerhalb von `bautakt.com` zusätzlich
`X-Robots-Tag: noindex, nofollow, noarchive` über `headers()` in
`apps/marketing/next.config.ts`. Das Root-Layout liefert Meta
`noindex, nofollow, nocache` inkl. `googleBot`. `robots.txt` bleibt `Disallow: /`.

## Warum

Meta und `robots.txt` waren schon da (`0bc8cc0`). Vercel setzt `X-Robots-Tag` aber
nur auf Preview-Deployments. Das Production-Deployment auf dem Hobby-Alias
`bautakt-web-marketing.vercel.app` (ohne Custom Domain, ohne Production-Auth)
antwortete ohne den Header — der fehlende dritte Layer gegenüber dem DPC-Vorbild.

## Prüfung

Gegen das ausgelieferte Deployment (Preview nach Merge auf dem Production-Alias):

```bash
curl -sI https://bautakt-web-marketing.vercel.app/
curl -sI https://bautakt-web-marketing.vercel.app/robots.txt
```

Beide müssen `x-robots-tag: noindex, nofollow, noarchive` zeigen; `/robots.txt` weiter
`Disallow: /`; Startseiten-HTML weiter mit Meta-`noindex`.
