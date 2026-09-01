# 2026-09-01 — SITE_URL auf Vercel-Alias (pre-go-live)

## Was

`NEXT_PUBLIC_SITE_URL` zeigt pre-go-live auf
`https://bautakt-web-marketing.vercel.app`, nicht auf `https://bautakt.com`
(IONOS-Parking). Zwei Schichten:

1. `apps/marketing/.env.production` setzt den Alias.
2. Der `SITE_URL`-Fallback in `apps/marketing/lib/site.ts` trägt denselben Wert —
   eine leere Dashboard-Variable kann den Parking-Canonical nicht wiederherstellen.

`IS_PRODUCTION_SITE` liest weiter die **rohe** Env und bleibt auf dem Alias `false`
(robots Disallow, Meta-noindex, X-Robots-Tag). `NEXT_PUBLIC_APP_URL` / `app.bautakt.com`
unberührt.

## Warum

Ohne gesetzte Variable fiel `urlOrFallback` auf `https://bautakt.com` zurück.
Canonical und `og:url` im Live-HTML zeigten deshalb auf die Parking-Seite. Eine
leere Vercel-Env-Variable überschattet `.env*`-Dateien — deshalb reicht
`.env.production` allein nicht; der Code-Fallback muss mitziehen.

## Prüfung

Nach Merge auf den Production-Alias:

```bash
curl -sL https://bautakt-web-marketing.vercel.app/ | grep -E 'canonical|og:url'
curl -s https://bautakt-web-marketing.vercel.app/robots.txt
curl -sI https://bautakt-web-marketing.vercel.app/ | grep -i x-robots
```

Canonical/`og:url` = Alias (oder Pfade darunter); `Disallow: /`; `x-robots-tag` mit
`noindex`.
