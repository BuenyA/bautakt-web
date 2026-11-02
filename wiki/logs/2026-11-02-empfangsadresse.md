# 2026-11-02 Empfangsadresse für Eingangsrechnungen (#221)

Unter Unternehmen > E-Mail steht eine eigene Karte zum Mail-Eingang.

- Mit `inbound_slug` zeigt sie `<slug>@in.bautakt.com` zum Kopieren und die Anleitung zur
  Weiterleitung. Ohne Slug sagt sie, dass die Adresse noch nicht eingerichtet ist.
- Die Oberfläche vergibt keinen Slug. Bis Lettermint bezahlt ist und DNS, Route und Webhook
  stehen, hat kein Betrieb einen.
- Der Zustand mit Slug ist nur mit einer im Browser umgeschriebenen Antwort getestet, nicht
  mit einem echten Slug in der Datenbank.
- `database.types.ts` neu erzeugt für `inbound_mails` und `source_inbound_mail_id`.
  `save_sales_document_draft.p_document_id` bleibt von Hand auf `string | null` gesetzt.
