# Weisse Produktionsseite bei fehlenden VITE_*-Env

Datum: 2026-09-07

## Was passiert ist

Auf dem Vercel-Projekt `bautakt-webapp` fehlten (oder waren leer) zur Build-Zeit
`VITE_SUPABASE_URL` und/oder `VITE_SUPABASE_ANON_KEY`. Vite inlined `undefined`.
`apps/webapp/src/lib/supabase.ts` rief `requireEnv` im Modulkopf auf und warf,
bevor `main.tsx` React mountete — sichtbares Ergebnis: weisse Seite.

## Was geändert wurde

- `supabase.ts` wirft nicht mehr beim Import. Stattdessen `supabaseBootError`
  und Client-Erzeugung nur bei gültiger Env; bei Fehler ein Proxy, der erst bei
  Zugriff wirft.
- `main.tsx` rendert bei `supabaseBootError` eine `BootErrorPage` (hardcoded
  Deutsch — Bootstrap darf nicht am i18n-Baum hängen).
- Wiki: [fallstricke.md](../pages/fallstricke.md),
  [deployment-vercel.md](../pages/deployment-vercel.md).

## Ops bleibt nötig

Der Code zeigt nur den Fehler. Ohne gesetzte Vercel-Env und Redeploy bleibt die
App nicht nutzbar — absichtlich, es gibt keinen sinnvollen Fallback auf eine
fremde Datenbank.
