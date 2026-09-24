# Webapp-Shell und Navigation

Wie die angemeldete Oberfläche in `apps/webapp` aufgebaut ist und welche
Informationsarchitektur gilt. Stand 2026-09-23: Neuaufbau mit shadcn/ui für
Geschäftsführung und Buchhaltung.

## Zielgruppe

Die Webapp ist für **Geschäftsführung und Buchhaltung am Schreibtisch**. Die
Handwerker auf der Baustelle bleiben in der Handy-App. Das entscheidet im
Zweifel: dichte Tabellen und Tastaturbedienung schlagen große Touch-Ziele.

## Layout

`SidebarProvider` / `Sidebar` / `SidebarInset` aus `@bautakt/ui` (shadcn).
Desktop: Sidebar links (240px, eingeklappt 64px Icon-Spalte), Topbar (56px)
mit Trigger, Brotkrumen, Firmenname und Glocke. Unter 1024px wird die Leiste ein
Overlay-Drawer. Innen 12px horizontal, 8px unter dem Logo, 2px zwischen den
Einträgen, Mindesthöhe 40px. Icons 18px, Abstand zum Label 10px.

Einklappen über den Trigger in der Topbar, den Kreis an der rechten Kante
(Hit-Fläche 32px, sichtbarer Kreis 28px, halb über der Border, Chevron) oder
`Strg`/`Cmd`+`B`. Der Zustand steht in einem Cookie (`bautakt_sidebar_state`),
**nicht** im localStorage: so steht er beim ersten Render fest und die Leiste
springt nach dem Laden nicht von breit auf schmal.

Eingeklappt bleiben die Icons stehen und zeigen den Namen als Tooltip. Die
Active-Pill wird dabei ein 40px-Quadrat mit Radius 8px um das Icon. Bewusst
nicht „ganz ausblenden": am Desktop verliert man damit die Anzeige, wo man ist.

## Navigation

Die Begriffe sind die der Handy-App, die **Anordnung bewusst nicht**. Am Telefon
liegt alles außer den Aufträgen unter „Unternehmen", weil dort nur fünf Reiter
Platz haben. Am Rechner wäre dieser Hub ein zusätzlicher Klick vor jeder
Rechnung, deshalb stehen die Bereiche flach nebeneinander, gruppiert:

| Gruppe         | Einträge                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| _(ohne)_       | Übersicht (`/uebersicht`, HOME)                                             |
| **Arbeit**     | Aufträge · Einsätze · Kalender · Zeiten                                     |
| **Finanzen**   | Angebote · Rechnungen · Offene Posten · Ausgaben · Mahnwesen · Auswertungen |
| **Team**       | Mitarbeiter · Abwesenheiten · Lohn                                          |
| **Stammdaten** | Kunden · Katalog · Kostenstellen                                            |
| _(unten)_      | Einrichtung · Nutzermenü mit Hell/Dunkel-Umschalter und Abmelden            |

Definiert in `components/layout/navItems.ts`. Eine Gruppe ohne sichtbare
Einträge verschwindet samt Überschrift — eine leere Überschrift „Finanzen" wäre
ein Hinweis auf etwas, das der Angemeldete nicht aufrufen kann.

Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.

## Rechte

Nav-Einträge filtert `maySee` über `hasPermission`; Einträge mit `anyPermission`
genügen sich mit einem der Rechte (Rechnungen sehen Buchhaltung **oder** GF).

Die Routen selbst schützt `RequirePermission` und zeigt sonst „Kein Zugriff".

⚠️ **Beides ist Führung, keine Kontrolle.** Die verbindliche Grenze sind RLS und
die `enforce_*`-Trigger. Der Nutzen des Wächters ist ein anderer: ohne ihn sieht
ein Direktaufruf ohne Recht eine leere Tabelle und damit aus wie ein Fehler der
Anwendung statt wie eine fehlende Berechtigung.

## Listen

Alle Listen laufen über `DataTable` aus `@bautakt/ui` (TanStack Table v9):
sortieren, suchen, filtern, blättern, Spalten ein-/ausblenden, CSV-Export.
Keine Seite baut ihre eigene Tabelle — sonst fehlt genau dort eine dieser
Fähigkeiten.

Der CSV-Export nimmt die gefilterten und sortierten Zeilen: exportiert wird, was
man sieht. Semikolon, CRLF und BOM, weil Excel in deutscher Einstellung sonst
alles in eine Spalte legt und Umlaute zerlegt.

Beträge stehen rechtsbündig mit `tabular-nums`, damit die Stellen untereinander
liegen.

## Icons und Theme

Icons sind die Flaticon-Uicons der Handy-App: die drei TTFs und die generierte
Glyph-Tabelle liegen in `packages/ui/src/icons/`. **Die Mobile-App ist
kanonisch**, der Generator bleibt drüben; neue Icons werden dort erzeugt und
hierher kopiert. Radix-interne Glyphen (Haken, Chevron) bleiben `lucide-react` —
das sind Bauteile der Primitives, keine Bautakt-Symbole.

Hell/Dunkel über `ThemeProvider` (Klasse `dark` am `<html>`, Wahl im
localStorage, Standard: Systemeinstellung). Die Farbwerte sind die Tokens aus
`packages/ui/src/styles/theme.css`.

Die `--sidebar-*`-Tokens sind seit 2026-09-24 eigene Werte (Expo-Docs-Optik),
keine Aliase auf `--accent` oder `--background-second`. Die Light-Sidebar ist
`#FFFFFF`. Der aktive Eintrag ist eine graue Pill (`#F3F4F6`, Dark `#1E2430`,
Radius 8px, Schrift 600) — nie ein Primary-Fill. Idle-Text ist
`--text-secondary` (`#374151` / Dark `#A8B0BD`). Hover im Light ist dieselbe
Fläche wie Active; im Dark die Surface `#1A1F28` (`--sidebar-accent-hover`).
Primary (`--sidebar-primary` / `--sidebar-ring`, `#3B86E0` / Dark `#4FA3E3`)
bleibt dem Fokus-Ring (2px, Offset 2px) und Badge-Zahlen vorbehalten.

⚠️ `--sidebar-accent` nicht wieder auf `--accent` legen. Das war der
Wave-1-Stand und färbt den aktiven Eintrag blau (`#E8F2FC` mit Vordergrund
`#3B86E0`).

Sektionsüberschriften (Arbeit, Finanzen, Team, Stammdaten) sind 12px / 600,
Title Case, Farbe `--text-subtle`. Kein Uppercase. Sie sind nur Beschriftung
der bestehenden Einträge, keine zusätzlichen Routen.

Dark (Stand 2026-09-24, Dark Mode v2) ist eine kühle Graublau-Stufe:
Hintergrund `#0F1115`, Sidebar `#161A22`, Surface `#1A1F28`, Card `#1E2430`.
Primary im Dark bleibt `#4FA3E3`. Light ist davon getrennt.

Die Sidebar scrollt in `SidebarContent` (`data-sidebar="content"`,
`overflow-y-auto`). Nur dieses Element bekommt den schmalen Scrollbar (6px,
Thumb `--border-strong`, Track transparent). Der Wrapper trägt
`overflow-hidden`; die übrige Seite behält den Browser-Scrollbar. Die
Collapse-Kontrolle (`SidebarRail`) wird deshalb aus dem Wrapper gehoben,
sonst schneidet `overflow-hidden` den Kreis auf der Border ab.

## Datenabfragen

Jeder `queryKey` beginnt mit `companyId`. Fertig angebunden: Aufträge, Einsätze,
Zeiten, Kunden, Verkaufsbelege (`sales_documents`), Zahlungen, Eingangsrechnungen
und Mahnungen. Geld- und Kennzahlenlogik liegt in `@bautakt/finance`.

## Schreiben

Zwei Muster, bewusst getrennt:

- **Seitenpanel (Sheet)** für kurze Formulare — Zahlung erfassen, Kunde anlegen,
  Auftrag anlegen. Die Liste dahinter bleibt sichtbar. Das Formular wird nur
  gemountet, solange das Panel offen ist, und startet damit jedes Mal frisch;
  sonst steht beim nächsten Öffnen die vorige Eingabe da und verleitet zur
  Doppelbuchung.
- **Eigene Seite** für Belege mit Positionen (`DocumentEditorPage`). Eine
  Positionsliste mit Menge, Einzelpreis, Rabatt und Steuersatz braucht die volle
  Breite.

Was die Datenbank besser weiß, macht die Datenbank: die Belegnummer vergibt
`finalize_sales_document`, die Genehmigung einer Abwesenheit `approve_absence`.
Beide tragen Prüfungen, die ein direktes `update` umginge.

⚠️ Bearbeitet werden nur Entwürfe. `enforce_sales_document_immutability` sperrt
festgeschriebene Belege; der Editor zeigt für sie keinen Speichern-Knopf,
sondern den Hinweis auf Storno und Gutschrift.

⚠️ `orders`, `customers`, `absences`, `articles` und `cost_centers` haben **kein**
`DEFAULT gen_random_uuid()` — beim Anlegen muss der Client die `id` mitgeben
(siehe [fallstricke.md](fallstricke.md)). Die vollständige Liste steht dort.

Gebaut sind: Zahlung, Kunde, Auftrag, Zeiteintrag, Abwesenheit, Ausgabe,
Mitarbeiter, Mahnung (mit Gebühr und Verzugszinsen) und der Beleg-Editor.
Auftrag anlegen: [auftrag-anlegen.md](auftrag-anlegen.md).

## Offen

- **Firmenstammdaten bearbeiten** — bewusst offen, siehe Abschnitt Schreiben.
- **E-Mail-Versand von Belegen** — dafür fehlt die Edge Function in
  `bautakt-app` (`finance-document-send` liefert 501). Bis dahin ist die
  Druckansicht der Weg zum Kunden.
- **Einladung von Mitarbeitern in die App** — läuft weiter über das Handy.
- **Katalog und Kostenstellen pflegen** — bisher nur lesend.
- **Mobilansicht** ist gebaut, aber noch nicht an einem echten Gerät geprüft.
