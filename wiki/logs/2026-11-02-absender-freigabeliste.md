# 2026-11-02 Absender-Freigabeliste und abgewiesene Mails (#280)

Die Karte zum Mail-Eingang liegt jetzt in `InboundMailCard.tsx`. Das Schema steht im Wiki von
`bautakt-app`.

- Die Freigabeliste pflegt nur der Owner, sichtbar erst mit einer Empfangsadresse. Andere Rollen
  sehen eine vorhandene Liste nur lesend.
- Abgewiesene Mails erscheinen auch ohne Empfangsadresse, sobald es welche gibt. Fällt der Slug
  weg, bleiben sie nachvollziehbar.
- `addSender` prüft wie die RPC und meldet den Fehler am Feld. Verbindlich bleibt die Datenbank.
- Änderungen stehen im bestehenden Änderungsprotokoll der Mail-Einstellungen.
