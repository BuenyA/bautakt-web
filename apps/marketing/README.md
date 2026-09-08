# Neue Marketing-Website

Aus dem Repository-Root starten: `npm run dev:marketing`.
Vorschau unter http://localhost:3000, Gestaltungsprobe unter /design.

Alle visuellen Komponenten liegen neu unter `components/cinema/`, sämtliche Texte
im deutschen i18next-Katalog `content/de.ts`. Keine alten Seitenkomponenten verwenden.
Auch SEO-Texte dürfen keine Wortspiele mit dem Produktnamen enthalten.

Medienkonfiguration: `content/media.ts`. Aktuell keine Personenbilder: Der Inhaber
verlangt eine neue Produktion mit erfahrenen Arbeitern um 48–60 Jahre. Diese ist
wegen fehlenden Higgsfield-Credits blockiert. Bis dahin abstrakte Hintergründe.
Aktuelle Prompts und Produktionshinweise: `design/`.

Die Produktansicht zeigt bewusst nur interaktive Beispieldaten. Keine Supabase-
Verbindung. Kontakt bereitet E-Mails vor; es wird nichts automatisch versendet.
Originale Markenassets und gemeinsame Design-Tokens bleiben die Markenquelle.

Vor Abschluss `npm run check` und `npm run build` im Repository-Root ausführen.
Browserprüfungen für Desktop, Mobilgeräte, Unterseiten und CTA-Ziele durchführen.
