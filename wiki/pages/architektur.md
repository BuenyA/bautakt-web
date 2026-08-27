# Architektur

Monorepo aus zwei Apps und fünf Paketen, npm-Workspaces mit Turborepo darüber.

## Warum npm und nicht pnpm

Das Root-Lockfile verlinkte beide Workspaces bereits korrekt, und Vercel erkennt npm
ohne Zutun. pnpms nicht-gehoistetes `node_modules` stolpert regelmäßig über die
Plugin-Auflösung von Next und die Pfadauflösung von shadcn. Bei zwei Apps und fünf
Paketen gibt es dafür keinen Gegenwert. Neu bewerten, wenn Installationszeit messbar
zum Problem wird oder die Paketzahl deutlich steigt.

## Pakete ohne Build-Schritt

`main` und `types` zeigen direkt auf `src/index.ts`. Vite verarbeitet das nativ; Next
braucht dafür `transpilePackages`.

Der Gewinn: keine Build-Orchestrierung, kein veraltetes `dist/`, HMR über Paketgrenzen.
Der Preis — die Apps typechecken den Paketquelltext mit — ist in Wahrheit ein Vorteil.

```
@bautakt/tsconfig, @bautakt/eslint-config   (keine Abhängigkeiten)
@bautakt/core        -> tsconfig
@bautakt/supabase    -> tsconfig
@bautakt/ui          -> tsconfig
apps/marketing       -> ui
apps/app             -> ui, supabase, core
```

⚠️ **`apps/marketing` hängt bewusst nicht an `@bautakt/supabase`.** Kein Client, kein
Key im Marketing-Bundle, keine Auth-Oberfläche auf `bautakt.com`. Ein späteres
Kontaktformular läuft über einen Next Route Handler mit serverseitigem Key.

## Warum überall ESLint

`apps/marketing` ist an `eslint-config-next` gebunden — das trägt die Regeln, die
Next-spezifische Brüche fangen. „oxlint überall" stand deshalb nie zur Wahl; die echte
Wahl war ESLint überall gegen einen Split aus zwei Lintern, zwei Konfigurationsformaten
und zwei Antworten auf die Frage, was `npm run lint` bedeutet. Ein einziges
Verifikations-Vokabular ist bei dieser Größe mehr wert als oxlints Tempo.

## Warum Prettier, obwohl die App keinen hat

`bautakt-app` hat bewusst keinen Formatter, und die Folge steht in dessen eigener
AGENTS.md: gemischte Quotes und Semikolons quer durch die Codebase. In einem Repo, in
dem Agenten arbeiten, hat das konkrete Kosten — jeder rät den Stil aus der zuletzt
gelesenen Datei zusammen, und Formatierungsrauschen verdeckt im Review die eigentliche
Änderung. Dasselbe Motiv steht hinter der erzwungenen Import-Sortierung.

## Ordnerstruktur: feature-first in apps/app

`bautakt-app` ist layer-first, und man sieht, was das kostet: `app/lib/` hat rund 60
Einträge auf einer Ebene plus 49 Module unter `lib/supabase/`. „Alles zu Aufträgen"
heißt dort drei Verzeichnisse durchsuchen.

Hier liegt ein Feature zusammen — Seiten, Abfragen, Komponenten. Layer-first bleibt nur
für echte Querschnitte: `components/layout/`, `components/common/`, `lib/`.

## Pfad-Aliase weichen voneinander ab

`paths` löst relativ zur deklarierenden tsconfig auf, deshalb geht es nicht einheitlich:

| Ort              | `@/*` zeigt auf                 |
| ---------------- | ------------------------------- |
| `apps/marketing` | eigene Wurzel (Next-Konvention) |
| `apps/app`       | `./src/*`                       |
| `bautakt-app`    | Projektwurzel                   |
