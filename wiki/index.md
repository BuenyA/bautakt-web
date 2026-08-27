# Bautakt Web — Wiki

Langzeitgedächtnis für Agenten und Menschen, die an `bautakt-web` arbeiten. Was hier
steht, ist das _Warum_ hinter dem Code und das, was hier schon schiefgegangen ist. Die
Verpflichtung zur Pflege steht in [AGENTS.md](../AGENTS.md); das _Wie_ in
[rules.md](rules.md).

Das Wiki der Mobile-App und des Backends liegt im Repo `bautakt-app` unter `wiki/`.
Alles zu Schema, RLS, Berechtigungen und Grants steht **dort** und wird hier nur
verlinkt, nie kopiert.

## Einstieg

| Seite                                                            | Inhalt                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [fallstricke.md](pages/fallstricke.md)                           | **Vor jeder Aufgabe lesen.** Was hier konkret schon schiefgegangen ist. |
| [beziehung-zu-bautakt-app.md](pages/beziehung-zu-bautakt-app.md) | Zwei Repos, ein Supabase-Projekt. Wer was besitzt.                      |
| [architektur.md](pages/architektur.md)                           | Monorepo, Pakete, warum welche Entscheidung so fiel.                    |

## Subsysteme

| Seite                                                      | Inhalt                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [auth-web.md](pages/auth-web.md)                           | Sitzung, Guards, Passwort-Reset und die Abweichungen zur App. |
| [berechtigungen-im-web.md](pages/berechtigungen-im-web.md) | Die 33 Rechte, drei Durchsetzungsebenen, Drift-Check.         |
| [deployment-vercel.md](pages/deployment-vercel.md)         | Zwei Projekte aus einem Repo, der SPA-Rewrite, Env-Präfixe.   |

## Protokolle

| Datum      | Eintrag                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| 2026-08-26 | [Fundament des Monorepos](logs/2026-08-26-monorepo-fundament.md)              |
| 2026-08-27 | [`apps/app` heißt jetzt `apps/webapp`](logs/2026-08-27-umbenennung-webapp.md) |

## Die drei wichtigsten Sätze

Übernommen aus dem Wiki von `bautakt-app`, weil sie hier genauso gelten.

1. **`tsc` und der Linter sind kein Korrektheitsnachweis.** Beide waren dort sauber,
   während gleichzeitig ein mandantenübergreifendes Datenleck, ein ganzjähriger
   Datumsfehler und ein nicht funktionierender Passwort-Reset existierten.
2. **Gegen das Ergebnis prüfen, nicht gegen die Konfiguration.** Nicht „Tailwind ist
   eingerichtet", sondern „im gebauten CSS steht `--primary`". Nicht „die Permissions
   stimmen", sondern „die Datenbank meldet dieselben 33 Keys".
3. **Der Client darf nie enger validieren als der Server akzeptiert.** Sonst sperrt die
   Oberfläche Eingaben aus, die fachlich erlaubt sind — und niemand findet den Grund im
   Backend.
