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
| [webapp-shell.md](pages/webapp-shell.md)                   | Shell-Layout, kanonische Top-Nav IA, Listen-Muster.           |
| [auftragsfotos.md](pages/auftragsfotos.md)                 | Fotos am Auftrag anzeigen, hochladen und löschen.             |
| [auftragsnotizen.md](pages/auftragsnotizen.md)             | Notizen am Auftrag lesen, anlegen, bearbeiten, löschen.       |
| [auftragszeiten.md](pages/auftragszeiten.md)               | Zeiten am Auftrag und auf `/zeiten` anlegen, ändern, löschen. |
| [auftragsmaterial.md](pages/auftragsmaterial.md)           | Material am Auftrag lesen, anlegen, ändern, löschen.          |
| [bautagebuch.md](pages/bautagebuch.md)                     | Bautagebuch am Auftrag lesen, anlegen, ändern, löschen.       |
| [auftragscheckliste.md](pages/auftragscheckliste.md)       | Checkliste am Auftrag lesen, abhaken, zuweisen.               |
| [auftrag-anlegen.md](pages/auftrag-anlegen.md)             | Auftrag aus der Liste anlegen, dieselbe `orders`-Zeile.       |
| [auftrag-bearbeiten.md](pages/auftrag-bearbeiten.md)       | Stammdaten eines Auftrags ändern, Teilpatch wie in der App.   |
| [einsatz-anlegen.md](pages/einsatz-anlegen.md)             | Einsatz anlegen und löschen, Zeiten bleiben stehen.           |
| [kostenstellen.md](pages/kostenstellen.md)                 | Kostenstelle anlegen und löschen, Auftragssumme je Zeile.     |
| [demo-gf-2026-10-10.md](pages/demo-gf-2026-10-10.md)       | Klickpfad GF-Demo 10.10.2026 (Spahrbau).                      |
| [datumseingabe.md](pages/datumseingabe.md)                 | Deutsche Datums- und Uhrzeitfelder, Wert bleibt ISO.          |

## Protokolle

| Datum      | Eintrag                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 2026-08-26 | [Fundament des Monorepos](logs/2026-08-26-monorepo-fundament.md)                                  |
| 2026-08-27 | [`apps/app` heißt jetzt `apps/webapp`](logs/2026-08-27-umbenennung-webapp.md)                     |
| 2026-09-01 | [X-Robots-Tag auf Marketing-Production](logs/2026-09-01-x-robots-tag.md)                          |
| 2026-09-01 | [SITE_URL auf Vercel-Alias (pre-go-live)](logs/2026-09-01-site-url-vercel-alias.md)               |
| 2026-09-06 | [Marketing Design Spec v4.4](logs/2026-09-06-marketing-design-spec-v44.md)                        |
| 2026-09-07 | [Wave 1: Shell, Aufträge, Kunden](logs/2026-09-07-wave1-shell-auftraege-kunden.md)                |
| 2026-09-07 | [APP_URL auf Webapp-Vercel-Alias (pre-Domain-Cutover)](logs/2026-09-07-app-url-vercel-alias.md)   |
| 2026-09-07 | [Weisse Webapp bei fehlenden VITE_*-Env](logs/2026-09-07-webapp-boot-env-error.md)                |
| 2026-09-08 | [Wave 2 Demo: Einsätze und Zeiten](logs/2026-09-08-wave2-einsaetze-zeiten.md)                     |
| 2026-09-11 | [Demo-GF-Lücken geschlossen](logs/2026-09-11-demo-gf-luecken.md)                                  |
| 2026-09-24 | [Web-Light-Primary auf Marketing-Blau](logs/2026-09-24-web-primary-marketing-blau.md)             |
| 2026-09-24 | [Auftragsfotos nur lesend](logs/2026-09-24-auftragsfotos.md)                                      |
| 2026-09-24 | [Dark Mode v2 und Sidebar-Scrollbar](logs/2026-09-24-dark-mode-v2.md)                             |
| 2026-09-24 | [Auftragsnotizen nur lesend](logs/2026-09-24-auftragsnotizen.md)                                  |
| 2026-09-24 | [Auftragszeiten nur lesend](logs/2026-09-24-auftragszeiten.md)                                    |
| 2026-09-24 | [Auftrag aus der Liste anlegen](logs/2026-09-24-auftrag-anlegen.md)                               |
| 2026-09-24 | [Sidebar-Optik Expo Docs](logs/2026-09-24-sidebar-expo-docs.md)                                   |
| 2026-10-01 | [Meta-Feeling Dark-Tokens](logs/2026-10-01-meta-feeling-tokens.md)                                |
| 2026-10-01 | [Light-Primary Electric](logs/2026-10-01-light-primary-electric.md)                               |
| 2026-10-01 | [Meta-Detailflächen Auftrag und Rechnung](logs/2026-10-01-meta-detail-surfaces.md)                |
| 2026-10-01 | [Meta Soft Primitives](logs/2026-10-01-meta-soft-primitives.md)                                   |
| 2026-10-01 | [Meta Listen und Formulare](logs/2026-10-01-meta-lists-forms.md)                                  |
| 2026-10-01 | [Meta-Detailflächen Kunde und Einsatz](logs/2026-10-01-meta-detail-customer-assignment.md)        |
| 2026-10-01 | [Sidebar-IA und Hub-Seiten](logs/2026-10-01-sidebar-ia-hubs.md)                                   |
| 2026-10-01 | [Mitarbeiterliste filtert auf Aktiv](logs/2026-10-01-mitarbeiter-listenfilter.md)                 |
| 2026-10-01 | [Kunden und Rechnungen filtern nach Art](logs/2026-10-01-kunden-rechnungen-listenfilter.md)       |
| 2026-10-05 | [Aufträge und Zeiten filtern wie in der App](logs/2026-10-05-auftraege-zeiten-listenfilter.md)    |
| 2026-10-05 | [Druckansicht bei unbekannter Beleg-Id](logs/2026-10-05-druckansicht-ungueltige-id.md)            |
| 2026-10-05 | [Überzahlung auf der Rechnung sichtbar](logs/2026-10-05-ueberzahlung-anzeige.md)                  |
| 2026-10-05 | [Einsatz anlegen und löschen](logs/2026-10-05-einsatz-anlegen-loeschen.md)                        |
| 2026-10-05 | [Kostenstellen anlegen, löschen, Auftragssumme](logs/2026-10-05-kostenstellen-anlegen.md)         |
| 2026-10-08 | [Zeit am Auftrag und auf /zeiten schreiben](logs/2026-10-08-zeit-erfassen.md)                     |
| 2026-10-08 | [Notizen am Auftrag schreiben](logs/2026-10-08-auftragsnotizen-schreiben.md)                      |
| 2026-10-08 | [Wiki verlinkt bautakt-app](logs/2026-10-08-wiki-link-bautakt-app.md)                             |
| 2026-10-08 | [Fotos am Auftrag hochladen und löschen](logs/2026-10-08-auftragsfotos-schreiben.md)              |
| 2026-10-08 | [Zeit nachtragen und Notiz-Panel: Smoke](logs/2026-10-08-zeit-nachtragen-smoke.md)                |
| 2026-10-08 | [Auftrag im Web bearbeiten](logs/2026-10-08-auftrag-bearbeiten.md)                                |
| 2026-10-08 | [Material am Auftrag](logs/2026-10-08-material-am-auftrag.md)                                     |
| 2026-10-08 | [Bautagebuch am Auftrag](logs/2026-10-08-bautagebuch.md)                                          |
| 2026-10-08 | [Checkliste am Auftrag](logs/2026-10-08-auftragscheckliste.md)                                    |
| 2026-10-08 | [Leerer Auftragsname im Sheet](logs/2026-10-08-auftrag-name-fehler.md)                            |
| 2026-10-08 | [Geldfelder mit zwei Nachkommastellen](logs/2026-10-08-geld-nachkommastellen.md)                  |
| 2026-10-08 | [Checkliste: Löschen abwarten, Abhaken sofort](logs/2026-10-08-checkliste-smoke.md)               |
| 2026-10-08 | [Overlay dunkel, Löschen in der Fußleiste](logs/2026-10-08-overlay-loeschen-fussleiste.md)        |
| 2026-10-08 | [Bautagebuch: Duplikat, Anwesenheit, Sperrtext](logs/2026-10-08-bautagebuch-smoke.md)             |
| 2026-10-09 | [Löschtext und gesperrtes Primary im Dunkelmodus](logs/2026-10-09-loeschtext-disabled-primary.md) |
| 2026-10-09 | [Deutsche Datums- und Uhrzeitfelder](logs/2026-10-09-datumseingabe.md)                            |

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
