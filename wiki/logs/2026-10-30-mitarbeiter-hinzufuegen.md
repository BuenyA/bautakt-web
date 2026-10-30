# Mitarbeiter hinzufügen wie in der App

2026-10-30. „Neuer Mitarbeiter“ öffnete ein Seitenpanel mit Vorname,
Nachname, Rolle, Tätigkeit, E-Mail und Telefon und legte immer eine
Beschäftigung ohne Konto an. Einladen ging nur am Handy. Der Owner fand das
nicht stimmig: Im Web soll es dieselben Wege geben wie in der App, auf einer
eigenen Seite statt im Panel.

Jetzt: `/mitarbeiter/neu` mit QR-Code, Code und „Ohne Konto“ (nur Name und
Rolle). Details in [mitarbeiter-hinzufuegen.md](../pages/mitarbeiter-hinzufuegen.md).
`EmployeeSheet` kann nur noch bearbeiten. Neue Abhängigkeit: `qrcode.react`
für den QR-Code als SVG.

Geprüft mit `npm run check` und im Browser gegen nachgebaute
Supabase-Antworten (Playwright): QR, Code, Rollenwechsel und „Neu generieren“
rufen `create_employment_invitation` mit der richtigen Rolle, „Ohne Konto“
ruft `create_manual_employment` und führt zurück zur Liste. Nicht geprüft:
mit einem echten Konto gegen die Datenbank und das Scannen mit der App.
