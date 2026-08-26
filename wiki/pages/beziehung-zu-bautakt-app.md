# Beziehung zu bautakt-app

Bautakt liegt in **zwei unabhängigen Git-Repos**, die sich **ein** Supabase-Projekt
teilen. Das ist die wichtigste Tatsache über dieses Repo, und fast jede Regel in
[AGENTS.md](../../AGENTS.md) folgt daraus.

| Repo          | Enthält                                                                                             | Remote               |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------- |
| `bautakt-app` | Expo/React-Native-App **und** `supabase/` (95 Migrationen, 7 Edge Functions) sowie das Backend-Wiki | `BuenyA/craft`       |
| `bautakt-web` | Marketing-Seite und Web-App                                                                         | `BuenyA/bautakt-web` |

Gemeinsames Projekt: `bxivzvmlcnaxqlytumvz` (`Bautakt`, `eu-central-1`, Postgres 17).
_Stand 2026-08-26: 49 Tabellen in `public`, alle mit RLS._

## Wer besitzt was

Das Schema gehört `bautakt-app`. Dieses Repo **liest** es. Auch eine Migration, die nur
das Web braucht, wird dort geschrieben und gehorcht dort geltenden Regeln.

`/supabase/` steht hier in der `.gitignore` — nicht aus Prinzipienreiterei, sondern
weil die Supabase-CLI beim Generieren der Types tatsächlich einen solchen Ordner anlegt
und er schon einmal in einem Commit gelandet ist.

## Was dupliziert ist und warum

Zwei Dinge sind bewusst Kopien:

1. **Die 33 Permissions und die sieben Systemrollen** in `packages/core`. Quelle ist
   `bautakt-app/app/lib/employees/`.
2. **Die Design-Tokens** in `packages/ui/src/styles/theme.css`. Quelle ist
   `bautakt-app/app/constants/theme.ts`.

Ein echtes geteiltes Paket hätte entweder ein npm-Release bei jeder Änderung gebraucht
oder ein Submodul. Vercels Shallow-Clone holt Submodule nicht ohne Zusatzkonfiguration,
und ein Release-Schritt für zwei Konsumenten kostet mehr, als das Problem wert ist.

Die Auflösung bei den Permissions: **maßgeblich ist keins der beiden Repos, sondern
Postgres.** Deshalb gibt es `packages/core/scripts/check-permission-drift.ts`. Damit ist
die Duplikation prüfbar statt bloß dokumentiert.

Bei den Tokens gibt es keinen automatischen Check. Dort gilt die Regel: **Abweichungen
zuerst in `bautakt-app` beheben**, dann herüberholen. Die Mobile-App ist älter und hat
die WCAG-Kontrastarbeit geleistet.

## Was hier bewusst anders ist

Drei Abweichungen, jeweils mit Grund — siehe [auth-web.md](auth-web.md) und
[architektur.md](architektur.md):

- Sitzung per `onAuthStateChange` statt einmaligem Lesen beim Mount.
- TanStack Query statt Cache-plus-Outbox. Die Web-App ist online-first.
- Feature-first statt layer-first bei der Ordnerstruktur.

## Geteilte Auth-Konfiguration ist eine Gefahrenstelle

⚠️ Beide Apps nutzen dieselben Supabase-Auth-Einstellungen. Eine Änderung der **Site
URL** schreibt `{{ .SiteURL }}` in den geteilten E-Mail-Templates um, die die
Mobile-App ebenfalls verwendet. Deren Passwort-Reset ist OTP-basiert und bewusst nicht
deep-linked, sollte also unberührt bleiben — aber vor einer Änderung die Templates
lesen, insbesondere Confirm-Signup.

Die Keys sind getrennt: Web nutzt den modernen `sb_publishable_`-Key, die App den
Legacy-Anon-JWT. Beide gelten gegen dieselbe RLS. Der Vorteil: der Web-Key lässt sich
rotieren, ohne die App mitzureißen.
