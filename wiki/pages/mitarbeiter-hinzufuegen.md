# Mitarbeiter hinzufügen

`/mitarbeiter/neu` (`EmployeeNewPage`), seit 2026-10-30. Eigene Seite statt
Seitenpanel, mit denselben drei Wegen wie die Handy-App
(`bautakt-app/app/app/(tabs)/management/employees/new-employee.tsx`). Recht:
`canManageEmployees`. Der Knopf „Neuer Mitarbeiter“ im Verzeichnis, die
Schnellsuche und alte Links mit `/mitarbeiter?neu=1` führen hierher.

## Die drei Wege

| Weg            | Was passiert                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **QR-Code**    | `create_employment_invitation('qr', rolle)`; der Code kodiert `bautakt://invite/<token>`. 7 Tage, mehrfach nutzbar.                            |
| **Code**       | `create_employment_invitation('token', rolle)`; Anzeige in Vierergruppen, kopieren oder als Einladungstext kopieren. 7 Tage, einmal nutzbar.   |
| **Ohne Konto** | Nur Vor-, Nachname und Rolle über `create_manual_employment`. Keine E-Mail, kein Telefon, keine Tätigkeit — das geht später über „Bearbeiten“. |

Laufzeit und Nutzungszahl setzt die Datenbankfunktion, nicht das Web (siehe
`bautakt-app`-Migration `20260809115703_employment_role_hierarchy.sql`).
Angenommen wird eine Einladung immer in der App, nie im Web.

## Einladung und Rolle

Die Einladung hängt an der Rolle (`invitations.ts`, `getOrCreateInvitation`):
Je Weg gibt es höchstens eine aktive Einladung. Passt ihre Rolle, wird sie
wiederverwendet; sonst — und bei „Neu generieren“ — wird sie über
`revoke_employment_invitation` widerrufen und eine neue erzeugt. So greift ein
schon verschickter Code mit der falschen Rolle nicht mehr.

Die Rollenauswahl zeigt nur, was ich vergeben darf (`assignableRoles` in
`useCompanyRoles.ts`): als Inhaber alle, sonst Rollen strikt unter dem eigenen
`sort_order`, nie die Inhaberrolle — wie `can_assign_employment_role`. Die
Datenbank prüft das ohnehin; die Liste erspart nur den Fehler.

⚠️ Der Query-Cache der Einladung hat `gcTime: 0`: Nach einem Rollenwechsel ist
die alte Einladung widerrufen und darf beim Zurückwechseln nicht kurz
aufblitzen.

## Tokenlänge

Die App behält eine aktive Einladung nur, wenn ihr Token 16 Zeichen hat
(`isCurrentInvitationToken`), und widerruft sonst bei jedem Öffnen von
„Mitarbeiter einladen“. Das Web prüft die Länge nicht.

Von 09.08. bis 30.10.2026 erzeugte die Datenbank versehentlich 48 Zeichen;
damit wurden verschickte Codes still ungültig. Seit
`bautakt-app`-Migration `20261030182757_restore_short_invitation_tokens` sind
es wieder 16 Zeichen (gemessen am 30.10.2026 mit `pg_get_functiondef`), siehe
https://github.com/BuenyA/bautakt-app/pull/155. Ob 64 Bit reichen, ist offen
in https://github.com/BuenyA/bautakt-app/issues/67.

## Bearbeiten

`EmployeeSheet` ist nur noch das Bearbeiten-Panel auf der
[Mitarbeiterseite](mitarbeiterseite.md); anlegen kann es nicht mehr.
