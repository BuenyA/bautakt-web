# Mein Profil, Unternehmen, Einstellungen

Das Benutzermenü unten links führt seit 2026-10-30 in drei getrennte Bereiche.
**Mein Profil** betrifft die eigene Person, **Unternehmen** den Betrieb und
**Einstellungen** nur die Bedienung. Bis dahin lag alles zum Betrieb auf einer
einzigen Seite `/einstellungen`, und Darstellung und Rechtliches standen direkt
im Menü (Owner: „ultra unordentlich“).

## Aufbau

| Bereich       | Adresse          | Inhalt                                                                                                                                                                                           |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mein Profil   | `/profil/…`      | Persönliche Daten, Konto & Sicherheit, Sprache, Hilfe & Feedback, Rechtliches                                                                                                                    |
| Unternehmen   | `/unternehmen/…` | Einrichtung (nur solange unvollständig), Stammdaten, Rechtliches, Bank, Nummernkreise, Rechnungsvorlage, Mahnwesen, Stundensätze, Kostenstellen, Katalog, E-Mail, DATEV, Rollen, Urlaub, Löschen |
| Einstellungen | `/einstellungen` | Darstellung (je Browser), Benachrichtigungen (je Betrieb, auch in der App)                                                                                                                       |

Mein Profil und Unternehmen nutzen `SubNavLayout`
(`components/layout/SubNavLayout.tsx`). Breit steht links eine Fluent-`Nav` mit
Gruppen und rechts der Abschnitt. Schmal (unter 1024 px) erscheint erst die
Liste, dann der Abschnitt mit einem Zurück-Knopf, wie in der App. Jeder Abschnitt
hat eine eigene Adresse. Beide Startadressen (`/profil`, `/unternehmen`)
leiten breit auf den ersten sichtbaren Abschnitt um.

Die Gruppen folgen der App (`SETUP_SECTIONS` in
`bautakt-app/app/lib/utils/managementHub.ts` und Mein Profil →
Einstellungen). Was die App nur ankündigt (Lizenzen, Integrationen, Ressourcen,
Lohnarten), steht hier nicht. „Berechtigungen“ (Gerätezugriffe) aus dem Profil
der App fehlt bewusst, weil es das im Browser nicht gibt (Owner, 2026-10-30).

## Wer was sieht

Sichtbarkeit und Bearbeitbarkeit je Abschnitt berechnet `companyAccess`
(`features/companySettings/companyAccess.ts`). Die Regeln sind am 2026-10-30 aus
den Live-Policies abgelesen. Die Datei nennt je Abschnitt die Policy oder RPC.
Abweichungen, die man kennen muss:

- **Belegnummern** schreibt `set_document_number_start`, und die prüft nur
  `canEditCompanyMasterData`, nicht `canManageCompanySettings`.
- **Logo**: Der Storage-Bucket `company-images` verlangt
  `canManageCompanySettings`. Wer nur Stammdaten pflegen darf, sieht das Logo
  lesend.
- **Rollen**: RLS erlaubt `canManageRoles` oder den Inhaber
  (`is_company_chef` = `is_company_owner`).

⚠️ Das ist Führung, keine Kontrolle; siehe
[berechtigungen-im-web.md](berechtigungen-im-web.md). Ein Abschnitt ohne Recht
zeigt beim Direktaufruf „Kein Zugriff“ (`SectionGuard`). Die Grenze bleibt RLS.

Den Menüpunkt „Unternehmen“ gibt es, sobald irgendein Abschnitt sichtbar ist
(`anyCompanySection`).

## Entscheidungen und Gründe

- **Einrichtung** (`/unternehmen/einrichtung`, `useCompanySetup`) zeigt den
  Einrichtungsstand: Anschrift, Steuernummer, Pflichtangaben für Mails, Bank.
  Den Abschnitt gibt es nur, solange davon etwas fehlt; danach verschwindet er
  aus der Leiste, und die Adresse leitet zurück (Owner, 2026-10-30). Das Logo
  steht als „Optional“ dabei und zählt nicht mit, sonst bliebe der Abschnitt
  für Betriebe ohne Logo für immer stehen. Die früheren Kacheln zu allen
  Abschnitten sind weg, sie wiederholten nur die Leiste. Bis der Stand
  geladen ist, leitet `/unternehmen` nicht um (`ready`), sonst landete man
  vorschnell in den Stammdaten.

- **Nummernkreise** sind nur editierbar, solange für die Belegart noch keine
  Nummer vergeben ist. Die RPC lehnt sonst mit `DOCUMENT_NUMBERS_ALREADY_ISSUED`
  ab (GoBD, lückenlos). Die Seite zählt je Belegart `sales_documents` mit
  Nummer und zeigt gesperrte Zeilen mit Schloss. Das Format ist das von
  `finalize_sales_document`: mit Präfix fünfstellig aufgefüllt, ohne Präfix
  die nackte Zahl.
- **Rechnungsvorlage**: Akzentfarbe, Einleitung und Schlusstext liegen auf
  `companies`. Bis 2026-10-30 hat der Web-Editor Einleitung und Schlusstext
  **nicht** übernommen, die Vorlage wirkte also nur in der App. Jetzt belegt
  `useCompanyTaxProfile` neue Belege damit vor (`DocumentEditorPage`). Die
  Farbpalette ist die der App. Ihre Hex-Werte sind gespeicherte PDF-Daten, keine
  Oberflächenfarben (Weiß darauf ≥ 4,5:1). Die Vorschau rendert eine
  Musterrechnung im selben Worker wie der Editor (#160). Das Bündel kommt von
  `finance-document-render`, die Akzentfarbe aus dem Formular.
- **Kalkulationswerte** (`company_finance_settings`: Gemeinkosten/h,
  Zuschläge, produktive Stunden) haben bewusst **keinen** Abschnitt. Weder die
  App noch das Web lesen sie (geprüft 2026-10-30). Ein Editor für Zahlen ohne
  Wirkung würde etwas vortäuschen. Sobald eine Kalkulation sie nutzt, gehört
  der Abschnitt dazu.
- **Stundensätze** (früher `/lohn`, leitet um) bearbeiten den Firmenstandard
  und die Rollensätze über `set_company_labor_rate` / `set_role_labor_rate`.
  Die schließen den laufenden Satz zum heutigen Tag ab, damit vergangene Zeiten
  ihren Satz behalten.
- **Rolle Geschäftsführer** (`system_key = 'owner'`) ist im Web nur lesbar. So
  kann sich niemand die Rechte zur Einrichtung entziehen. Die App erlaubt das
  heute noch. Rollen lassen sich nicht umbenennen
  (`trg_company_roles_block_rename`). Löschen geht nur bei eigenen Rollen ohne
  Mitglieder (`trg_company_roles_block_delete`).
- **Weiteres Unternehmen anlegen** läuft über `/betrieb-einrichten?weiteres=1`.
  `MembershipGate` lässt das trotz bestehender Mitgliedschaft zu.
  `createOwnerCompany` kann die alte Hauptbeschäftigung per RLS oft nicht
  zurücksetzen (Update auf `employments` braucht Personalrechte im alten
  Betrieb). Deshalb ruft die Seite danach `switch_primary_company` auf
  (SECURITY DEFINER).
- **Unternehmen wechseln, beitreten, verlassen**: `switch_primary_company`,
  `accept_employment_invitation` (danach Wechsel in den neuen Betrieb),
  `leave_company`. Danach `queryClient.resetQueries()`. Jeder Schlüssel trägt
  den Mandanten, angezeigt wird sofort der neue Betrieb.
- **Konto löschen** ist wie in der App eine Mail an den Support. Die
  Telefonnummer der App (`+49 176 1234 5678`) ist nicht übernommen, sie sieht
  nach einem Platzhalter aus.
- **Sprache** speichert `profiles.language` mit den Codes der App. Die
  Web-Oberfläche bleibt deutsch (nur der `de`-Katalog wird gepflegt), und die
  Seite sagt das offen.

## Schriftgrößen

Die Unternavigation hat dieselbe Dichte wie die Seitenleiste (Fluent-Standard,
20-px-Icons, Gruppenüberschriften in 14 px). In den Abschnitten gibt es keinen
12-px-Text: Schalter mit Erklärung laufen über `SwitchRow`
(`components/common/SwitchRow.tsx`), Feldhinweise hebt `.bautakt-readable` in
`index.css` auf 14 px. Der Owner fand die Fluent-Kleinschrift dort unlesbar
(2026-10-30).

## Ungespeicherte Eingaben

`UnsavedChangesGuard` (ein Guard je Bereich, React Router erlaubt nur einen
Blocker) fragt beim Verlassen der Seite nach, `beforeunload` beim Schließen
des Tabs. Karten melden sich über `useReportUnsaved`. `FormCard` macht das
selbst. Der Wechsel zwischen Rollen innerhalb der Rollenseite fragt nicht
nach, dort gehen ungespeicherte Schalter verloren.

## Code

- `components/layout/UserMenu.tsx`, `SubNavLayout.tsx`
- `features/profile/*`, `features/companySettings/*`, `features/settings/*`
- Texte: `locales/de/account.json`, `locales/de/companySettings.json`
