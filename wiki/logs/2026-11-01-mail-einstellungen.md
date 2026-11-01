# 2026-11-01 Mail-Einstellungen: Versandmodus und Testadressen im Web (#274)

Bisher setzte der Owner Versandmodus und Testadressen per SQL. Seit bautakt-app#168
gibt es `set_company_mail_settings`, seit bautakt-app#170 `get_company_mail_settings`.

- Der Bereich „E-Mail-Versand“ zeigt allen mit Zugriff die wirksame Stufe und die
  Obergrenze der Plattform. Senkt die Obergrenze den gewählten Modus ab, erklärt ein
  Hinweis ihren Vorrang.
- Nur die Geschäftsführung (`system_key = 'owner'`) wählt den Modus (Probelauf oder
  Testmodus, „Aktiv“ nur halten) und pflegt die Testadressen. Ungespeichertes meldet
  der `UnsavedChangesGuard`.
- Das Änderungsprotokoll ist nur lesbar und nur für die Geschäftsführung.
- `database.types.ts` neu erzeugt. Eine Stelle weicht vom Generator ab und ist von
  Hand nachgezogen: `save_sales_document_draft.p_document_id` ist `string | null`
  (der Generator kennt keine nullbaren Parameter).
- Browser-Test in der Testfirma: Probelauf gespeichert, Datenbank und Protokoll
  geprüft, zurück auf Testmodus. Die Testfirma steht wieder auf `allowlist`, das
  Protokoll hat zwei Einträge.
