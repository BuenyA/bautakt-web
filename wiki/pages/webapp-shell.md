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
Desktop: Sidebar links (16rem, eingeklappt 3,25rem Icon-Spalte), Topbar (56px)
mit Trigger, Brotkrumen, Firmenname und Glocke. Unter 1024px wird die Leiste ein
Overlay-Drawer.

Einklappen über den Trigger, die Rail am Rand oder `Strg`/`Cmd`+`B`. Der Zustand
steht in einem Cookie (`bautakt_sidebar_state`), **nicht** im localStorage:
so steht er beim ersten Render fest und die Leiste springt nach dem Laden nicht
von breit auf schmal.

Eingeklappt bleiben die Icons stehen und zeigen den Namen als Tooltip. Bewusst
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
`packages/ui/src/styles/theme.css`; die `--sidebar-*`-Namen sind Aliase auf
bestehende Werte. Die Leiste scrollt in `[data-sidebar="content"]`
(`SidebarContent` in `packages/ui/src/components/ui/sidebar.tsx`). Nur dieses
Element trägt die dünne Scrollbar (6px, Thumb `--border-strong`).

## Datenabfragen

Jeder `queryKey` beginnt mit `companyId`. Fertig angebunden: Aufträge, Einsätze,
Zeiten, Kunden, Verkaufsbelege (`sales_documents`), Zahlungen, Eingangsrechnungen
und Mahnungen. Geld- und Kennzahlenlogik liegt in `@bautakt/finance`.

## Schreiben

Zwei Muster, bewusst getrennt:

- **Seitenpanel (Sheet)** für kurze Formulare — Zahlung erfassen, Kunde anlegen.
  Die Liste dahinter bleibt sichtbar. Das Formular wird nur gemountet, solange
  das Panel offen ist, und startet damit jedes Mal frisch; sonst steht beim
  nächsten Öffnen die vorige Eingabe da und verleitet zur Doppelbuchung.
- **Eigene Seite** für Belege mit Positionen (`DocumentEditorPage`). Eine
  Positionsliste mit Menge, Einzelpreis, Rabatt und Steuersatz braucht die volle
  Breite.

Was die Datenbank besser weiß, macht die Datenbank: die Belegnummer vergibt
`finalize_sales_document`, die Genehmigung einer Abwesenheit `approve_absence`.
Beide tragen Prüfungen, die ein direktes `update` umginge.

⚠️ Bearbeitet werden nur Entwürfe. `enforce_sales_document_immutability` sperrt
festgeschriebene Belege; der Editor zeigt für sie keinen Speichern-Knopf,
sondern den Hinweis auf Storno und Gutschrift.

⚠️ `customers`, `absences`, `articles` und `cost_centers` haben **kein**
`DEFAULT gen_random_uuid()` — beim Anlegen muss der Client die `id` mitgeben
(siehe [fallstricke.md](fallstricke.md)).

Gebaut sind: Zahlung, Kunde, Zeiteintrag, Abwesenheit, Ausgabe, Mitarbeiter,
Mahnung (mit Gebühr und Verzugszinsen) und der Beleg-Editor.

## Offen

- **Firmenstammdaten bearbeiten** — bewusst offen, siehe Abschnitt Schreiben.
- **E-Mail-Versand von Belegen** — dafür fehlt die Edge Function in
  `bautakt-app` (`finance-document-send` liefert 501). Bis dahin ist die
  Druckansicht der Weg zum Kunden.
- **Einladung von Mitarbeitern in die App** — läuft weiter über das Handy.
- **Katalog und Kostenstellen pflegen** — bisher nur lesend.
- **Mobilansicht** ist gebaut, aber noch nicht an einem echten Gerät geprüft.
