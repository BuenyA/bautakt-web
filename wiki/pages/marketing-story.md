# Marketing-Website: vollständiger Neuaufbau

Stand 2026-09-08 nach der Korrektur des Inhabers. Sämtliche bisherigen Seitenansichten,
Marketing-Komponenten und Textkataloge wurden entfernt und neu geschrieben.
Die frühere ScrollStory-Komponente ist ebenfalls verworfen. Nur technische
Projektkonfiguration, zentrale Domainregeln und originale Marken-SVGs bleiben.

## Verbindliche Gestaltung

Keine Wortspiele mit dem Namensbestandteil „Takt“, auch nicht in Metadaten,
Unterseiten oder Gestaltungsproben. Die vorherigen Vorschläge verletzten diese
Vorgabe. Titelbild und erste Aussage sind positiv: „Gute Arbeit. Alles im Griff.“
Erst nach dem Scrollen beginnt die negative Baustellensituation.

Die Personen werden vollständig neu generiert: erfahrene Arbeiter um 48–60 Jahre,
natürliche mitteleuropäische Erscheinung, alltägliche Arbeitskleidung und passende
Schutzausrüstung auf einer deutschen Baustelle. Keine jungen Werbemodels.

## Implementierung

`apps/marketing/components/cinema/` enthält ausschließlich neue Komponenten:
Experience, ScenicMedia, ProductExplorer, SiteFrame und Interior.
`content/de.ts` ist der einzige deutsche i18next-Katalog (Namespace `site:`).
`app/globals.css` ist vollständig neu. Die kanonischen Farbtokens werden importiert;
keine alten UI-Komponenten oder Karten werden benutzt.

Startseite: positiver Einstieg, kurze angeheftete Chaos/Überblick-Sequenz,
drei redaktionelle Beweiszeilen, Abschluss. Der feste CTA führt direkt zur
interaktiven Beispielansicht unter `/funktionen#produktdemo`. Die Funktionsseite
bietet Auftragssuche, Auftragsdetails, Planungsansicht und einen demonstrativen
Rechnungsstatuswechsel. Alle Daten sind ausdrücklich Beispiele; keine Datenbank,
keine Anmeldung, keine mutierenden Backend-Aufrufe.

Auch Preise, Über uns, Kontakt, 404 und Rechtstext-Gerüste sind neu aufgebaut.
Preise bleiben auf Anfrage; keine erfundenen Beträge oder Vertragszusagen.
Kontakt öffnet einen E-Mail-Entwurf, versendet nichts. Rechtstextseiten bleiben
unverbindliche Gerüste mit sichtbarem Prüfhinweis und noindex. Die Sitemap enthält
weiterhin acht Inhaltsrouten, `/design` gehört nicht dazu.

## Medienstand

Nach der Alterskorrektur sind sämtliche zuvor generierten Personenbilder aus dem
aktiven Projekt entfernt. Higgsfield meldet 0 Credits. Ein neuer Generierungsversuch
mit dem korrigierten Personenbriefing wurde ebenfalls wegen fehlender Credits
abgelehnt; es gibt keinen neuen Job. Die vier Medienzuordnungen sind leer.
Die Seite verwendet deshalb vorübergehend abstrakte CSS-Hintergründe. Das ist
keine fertig produzierte Bild- oder Video-Story.

`design/image-production.json` enthält das aktuelle gemeinsame Personenbriefing,
vier Szenen und die Referenz-Abhängigkeit zur ersten Szene. Erst mit Guthaben die
Standbilder erzeugen und prüfen; danach kurze Videos. Keine alten Personenbilder
als stillen Ersatz einsetzen. Details in `apps/marketing/design/PRODUKTION.md`.
