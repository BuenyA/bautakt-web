# 2026-09-07 — APP_URL auf Webapp-Vercel-Alias (pre-Domain-Cutover)

## Was

`NEXT_PUBLIC_APP_URL` / `APP_URL` zeigt pre-Domain-Cutover auf
`https://bautakt-webapp.vercel.app`, nicht auf `https://app.bautakt.com` (Domain noch
nicht verknüpft). Zwei Schichten, analog zu SITE_URL vom 2026-09-01:

1. `apps/marketing/.env.production` und `.env.example` setzen den Webapp-Alias.
2. Der `APP_URL`-Fallback in `apps/marketing/lib/site.ts` trägt denselben Wert —
   eine leere Dashboard-Variable kann tote `app.bautakt.com`-CTAs nicht wiederherstellen.

`LOGIN_URL` und `REGISTER_URL` bleiben `${APP_URL}/login` bzw.
`${APP_URL}/registrieren`. `IS_PRODUCTION_SITE` / noindex unverändert — die Gate-Logik
hängt nur an `NEXT_PUBLIC_SITE_URL`.

## Warum

Marketing-CTAs liefen über `APP_URL` auf `https://app.bautakt.com/…`. Solange die
Domain im Vercel-Projekt `bautakt-webapp` fehlt, sind Login- und Registrieren-Links tot.
Der Vercel-Alias liefert die Webapp bereits.

## Prüfung

Ohne gesetzte Env (oder mit leerem Dashboard-Wert):

- `REGISTER_URL` → `https://bautakt-webapp.vercel.app/registrieren`
- `LOGIN_URL` → `https://bautakt-webapp.vercel.app/login`

Mit `NEXT_PUBLIC_APP_URL=https://app.bautakt.com` gewinnt die Env weiterhin.
