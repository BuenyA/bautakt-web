# 2026-10-09 — Login ohne Registrierungslink

Öffentliche Registrierung ist in Supabase Auth seit 09.10.2026 12:04 aus
(Owner-Entscheidung).

## Was geändert wurde

Die Login-Seite zeigt „Noch kein Konto? Betrieb einrichten“ nicht mehr. Die
Keys `auth:signIn.noAccount` und `auth:signIn.toRegister` sind weg. Unter der
Karte bleibt kein Abstand und kein Trenner: `AuthCard` rendert die Fußzeile
nur, wenn eine übergeben wird.

`/registrieren` und die Seite selbst bleiben. Schlägt `signUp` fehl, weil die
Registrierung aus ist, zeigt `FormError` „Die Registrierung ist derzeit nur
auf Einladung möglich.“ (`errors:auth.signupDisabled`). Erkannt wird der Code
`signup_disabled` und, wenn kein anderer Code gesetzt ist, der GoTrue-Satz
„Signups not allowed for this instance“. Das Formular wird nicht vorher
gesperrt.

In der Web-App verlinkte sonst nichts auf `routes.register`. Marketing
verlinkt `/registrieren` seit [#136](https://github.com/BuenyA/bautakt-web/issues/136)
nicht mehr.

## Warum

Wer sich anmeldet, soll nicht in eine Registrierung geschickt werden, die der
Server ablehnt. Wer die Adresse trotzdem aufruft, soll einen deutschen Satz
sehen und nicht den englischen Supabase-Text.

Einladungen und das Passwort-Setzen rufen `signUp` nicht auf. Siehe
[auth-web.md](../pages/auth-web.md).

Issue: [#145](https://github.com/BuenyA/bautakt-web/issues/145).

## Verweise

- [auth-web.md](../pages/auth-web.md)
