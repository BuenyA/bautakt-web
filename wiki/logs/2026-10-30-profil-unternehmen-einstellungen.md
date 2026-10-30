# 2026-10-30 — Profilmenü neu: Mein Profil, Unternehmen, Einstellungen

**Anlass:** Owner-Wunsch. Das Popup unten links und `/einstellungen` waren
„ultra unordentlich“: Firmendaten, Steuer, Bank, DATEV, E-Mail und Rollen
lagen als Karten auf einer Seite, Darstellung und Rechtliches direkt im Menü.
Das Konzept wurde im Chat abgestimmt, dann kam das Go.

**Was sich geändert hat**

- Menü: Betrieb mit Untermenü (wechseln, beitreten, anlegen), Mein Profil,
  Unternehmen, Einstellungen, Abmelden.
- `/profil/…` neu: persönliche Daten mit Profilbild, E-Mail und Passwort ändern,
  Unternehmen verlassen, Konto löschen per Mail, Sprache, Hilfe mit FAQ und
  Feedback (`feedback`, `platform = 'web'`), Rechtliches.
- `/unternehmen/…` neu mit Übersicht (Einrichtungsstand). Neu bearbeitbar:
  Nummernkreise, Zahlungsziel, Rechnungsvorlage mit Logo und Live-Vorschau,
  Mahnstufen, Stundensätze, Rollen & Berechtigungen, Urlaubskontingent,
  Unternehmen löschen.
- `/einstellungen` enthält nur noch Darstellung und Benachrichtigungen.
- Umzüge mit Umleitung: `/katalog`, `/kostenstellen` → `/unternehmen/…`;
  `/lohn` → `/unternehmen/stundensaetze`.
- Der Beleg-Editor übernimmt jetzt Einleitung und Schlusstext der
  Rechnungsvorlage für neue Belege.
- Keine Migration. Alle Tabellen, Policies und RPCs gab es schon (geprüft
  gegen die Live-Policies).

**Bewusst nicht gebaut:** Kalkulationswerte (`company_finance_settings`),
weil nichts sie liest. Gerätezugriffe aus dem App-Profil, weil es sie im
Browser nicht gibt (Owner).

**Geprüft:** `npm run check` ist grün. Durchgeklickt wurde mit nachgebildeten
Supabase-Antworten in Playwright (kein Test-Login vorhanden): alle Abschnitte
breit und schmal, Rückfrage bei ungespeicherten Änderungen, Speichern schickt
nur die Formularfelder, Live-Vorschau rendert die Akzentfarbe. **Gegen die echte
Datenbank noch nicht geprüft.**

Details: [unternehmen-und-profil.md](../pages/unternehmen-und-profil.md).
