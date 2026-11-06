# 06.11.2026: Sperrseite und Lesehinweis nach Vertragsende (Löschkonzept WP3)

**Was:** Die Web-App fragt `my_company_lifecycle()` ab (Schema: [bautakt-app, loeschkonzept.md#login-sperre-wp3](https://github.com/BuenyA/bautakt-app/blob/main/wiki/pages/loeschkonzept.md#login-sperre-wp3)).

- Mitarbeitende ab Vertragsende und alle ab `locked` sehen statt der App die Sperrseite (`CompanyLockedPage`, aus `MembershipGate`). Dort können sie in einen anderen Betrieb wechseln, einen neuen Betrieb anlegen oder sich abmelden.
- Der Inhaber in `export_only` sieht über jeder Seite einen Hinweis mit den Fristen und einem Link zum Datenexport (`CompanyReadOnlyBanner` in `AppShell`). Die Knöpfe bleiben sichtbar. Schreiben lehnt die Datenbank mit `COMPANY_READ_ONLY` ab, `readableDbError` übersetzt das.
- Die Logik steckt in `features/company/lifecycle.ts` und ist getestet.

**Warum so:** Die Sperre selbst sitzt in der Datenbank. Die Seite soll nur erklären, warum nichts mehr geht; deshalb sperrt ein Fehler beim Abruf nichts.

**Nebenbei:**

- `createOwnerCompany` setzt den aktiven Betrieb jetzt zusätzlich über `switch_primary_company`. Im gekündigten Betrieb lässt RLS das direkte UPDATE auf die alte Beschäftigung nicht mehr zu. Ohne die RPC wären beide Beschäftigungen `is_primary`.
- Typen neu erzeugt. Seit WP1 (bautakt-app#203) sind mehrere `user_id`-Spalten nullable, weil gelöschte Konten ihre Zeilen behalten. `OrderDocument.userId`, `OrderChecklistParent.userId` und die Prüfungen in `dailyReportAccess.ts` und `orderMaterialAccess.ts` nehmen jetzt `null` an. Eine Zeile ohne Konto gilt nie als eigene.
- Der Typgenerator schreibt RPC-Argumente seit diesem Lauf ohne `| null`. Beim Aufruf von `save_sales_document_draft` steht deshalb ein Cast mit Kommentar.

**Screenshots:** Die Zustände lassen sich am Testbetrieb nicht herstellen, weil `export_only` nicht zurück auf `active` kann. Die Antwort von `my_company_lifecycle` wurde deshalb im Browser ersetzt (Playwright `page.route`).
