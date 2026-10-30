# Registrierung und Einrichtung wie in der App

2026-10-30. Ein frisch registriertes Konto stand ohne Betrieb da: kein Weg zum
Beitritt, keine Anschrift, und die Registrierung kannte nur E-Mail und
Passwort. Gemessen am Konto des Owners (30.10.2026): `profiles` mit
`NULL`-Namen, keine Zeile in `employments`. Der Code auf `main` leitete so ein
Konto bereits nach `/betrieb-einrichten` (lokal nachgestellt); dass der Owner
trotzdem auf der Übersicht landete, spricht für einen älteren Produktionsstand
— nicht verifiziert, Vercel ist von hier nicht einsehbar.

Geändert:

- `/registrieren` fragt Vorname, Nachname und Geburtsdatum mit ab und gibt
  sie als `user_metadata` an `signUp` (ohne Sitzung ist `profiles` noch nicht
  beschreibbar). Doppelte Adresse wird über die leere `identities`-Liste
  erkannt.
- `/betrieb-einrichten` ist ein Assistent: (Über mich) → Gründen oder
  beitreten → Betrieb + Anschrift bzw. Einladungscode/QR → Willkommen.
- Beitritt über `accept_employment_invitation`, QR per Kamera oder Foto
  (`jsqr` 1.4.0 als neue Abhängigkeit der Web-App).

Warum die Anschrift hier Pflicht ist, obwohl die App sie später holt: Owner-
Wunsch, und ohne Anschrift geht keine Rechnung hinaus. Details:
[auth-web](../pages/auth-web.md#betrieb-einrichten).

Nachtrag: Die Login-Seite verlinkt wieder auf `/registrieren` („Noch kein
Konto? Registrieren“) — Owner-Wunsch. Das hebt
[Login ohne Registrierungslink](2026-10-09-login-ohne-registrierung.md) auf;
die Registrierung ist in Supabase wieder offen.
