# Produktion und Bearbeitung

Stand 2026-09-08 nach zwei ausdrücklichen Korrekturen: vollständiger Neuaufbau und
neue Personen im Alter von etwa 48–60 Jahren. Die vorige Umsetzung ist verworfen.

## Design und Story

Die Website ist neu komponiert: randfüllender positiver Einstieg, darüber schmale
Navigation; große Groteskschrift mit kursiver Serifenschrift als zweiter Stimme.
Nach dem ersten Bildschirm beginnt eine kompakte Chaos/Überblick-Sequenz,
darauf drei redaktionelle Zeilen und ein Abschluss. Keine alte Hero-, Preis-,
FAQ-, FeatureGrid- oder ScrollStory-Komponente vorhanden.

Gemeinsame Farbtokens und originale Logos bleiben als Markenbasis. Alle sichtbaren
Texte kommen aus `content/de.ts` über i18next mit `site:`-Namespace. Kein Wortspiel
mit „Takt“, weder in Headline noch SEO, Nebenroute oder Gestaltungsprobe.

Start im Repository-Root: `npm run dev:marketing`. Lokale Startseite auf
http://localhost:3000, Gestaltungsprobe auf http://localhost:3000/design.
Kein Deployment ausgelöst.

## Bildproduktion: blockiert

Aktuelles Briefing und vier vollständige Prompts in `image-production.json`.
Arbeiter 48–60 Jahre, natürliche mitteleuropäische Erscheinung, authentische deutsche
Baustellenkleidung, sichtbare Berufserfahrung, keine jungen Werbemodels.
Zuerst positives Titelbild erzeugen; die akzeptierte Figur und Umgebung als Referenz
für Chaos, Überblick und Abschluss verwenden. Motive vor Videoerstellung prüfen.

Higgsfield Private-Workspace: 0 Credits. Der Versuch mit dem korrigierten Briefing
wurde mit `Out of credits on free (null) plan in Private workspace` abgelehnt.
Kein Job angelegt. Kein Abonnement gestartet, kein Konto gewechselt.
Sämtliche früheren Personenbilder sind aus dem Projekt entfernt. Aktuell zeigt die
Website abstrakte CSS-Hintergründe, keine fertig generierten Bild- oder Videoszenen.

Frühere, ausdrücklich verworfene Jobs (nicht wieder herunterladen oder integrieren):
141fd096-fe5e-4f34-9c82-8bfcd5dba182, d348af98-5d09-48cb-b54e-207c5ba1e9f2,
db64ab2e-e8e1-462b-93b2-7572457653d4, 86ffcfb3-c7db-4c43-9438-fb9038fdda26,
4c11eee6-7d1a-4dc3-8af8-c33b31658fae. Letzterer war abgeschlossen, wurde nach der
Alterskorrektur nicht heruntergeladen. Das ist eine Herkunftsnotiz, keine aktive Auswahl.

## Nach Bereitstellung von Credits

Keine der abgelehnten Generationen hat eine Job-ID. Die erste neue Szene einmal
anfordern, bei pending warten. Für abhängige Motive die akzeptierte erste Job-ID als
Bildreferenz übergeben. Gesichter, Kleidung, Sicherheit, Crop und Textfreiraum prüfen.
Originale in `design/` erhalten, optimierte WebP-Poster in `public/cinema/` ablegen.
Erst danach die optionalen Posterpfade in `content/media.ts` setzen.

Videos über Higgsfield: etwa 4–5 Sekunden pro Szene, 720p, ohne Ton oder eingebrannte
Schrift. Subtile Bewegung; nicht aus einer einzigen Geste eine lange Scrollstrecke
machen. Bei echter Bewegungsfortsetzung akzeptierten letzten Frame extrahieren und
als nächsten Startframe verwenden, Naht visuell prüfen.
H.264, yuv420p, faststart, höchstens 1280 px Breite, etwa CRF 26 und 24 fps sind
Startwerte. Transfergröße messen; Ziel ungefähr 1 MB pro kurzem Clip. Originale
aufbewahren. Keine Bildsequenz nötig, da kurze Loops gewünscht sind.

ScenicMedia startet nur sichtbare Videos, berücksichtigt reduzierte Bewegung,
Save-Data/2g, Pause und ausgeblendeten Tab. Die Poster bleiben als Fallback erhalten.
Echte Video-Loop-Nähte und Videonetzwerklast sind ohne Clips nicht geprüft.

## Bedienung

Der feste Button öffnet `/funktionen#produktdemo`. Die neue Demo bietet drei
Tastatur-bedienbare Tabs, Auftragssuche, Auftragsdetails und einen Beispielstatus
für Rechnungen. Alles erfundene Daten, ausdrücklich gekennzeichnet. Keine Backend-
Anbindung und keine tatsächlichen Zahlungen oder Rechnungsänderungen.
Der Abschluss führt zu `/kontakt`; dort wird nur ein E-Mail-Entwurf vorbereitet.
Rechtliches enthält ausschließlich Gerüste mit noindex, keine erfundenen Rechtstexte.
