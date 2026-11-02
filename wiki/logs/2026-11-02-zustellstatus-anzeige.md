# 2026-11-02 Zustellstatus am Beleg und an der Eingangsrechnung (#276)

Seit [bautakt-app#247](https://github.com/BuenyA/bautakt-app/issues/247) schreibt der
Lettermint-Webhook Rückmeldungen, die View `mail_delivery_status` fasst sie je Mail zusammen.
Das Schema steht im Wiki von `bautakt-app`.

- `MailDeliveryStatus.tsx` zeigt je versendeter Mail Status, Empfänger und Zeitpunkt, an
  der Eingangsrechnung und am festgeschriebenen Ausgangsbeleg.
- Unzustellbar wird zur Fehlermeldung und erledigt sich erst, wenn eine spätere Mail
  zugestellt wurde. Eine Spam-Beschwerde bleibt als Warnung stehen, denn erneutes Senden
  behebt sie nicht (`openDeliveryProblems`, `mailDelivery.ts`).
- Mails ohne Rückmeldung bleiben bei „Versendet“. Auch ein unbekannter Status gilt als
  „Versendet“, damit nie fälschlich „Zugestellt“ dasteht.
- Rückmeldungen kommen zeitversetzt. Bis 15 Minuten nach dem Versand lädt die Anzeige
  offene Mails alle 30 Sekunden nach (`shouldPollDelivery`), danach erst beim nächsten Laden.
- `database.types.ts` neu erzeugt. `save_sales_document_draft.p_document_id` bleibt von Hand
  auf `string | null` gesetzt.
- Browser-Test in der Testfirma, hell und dunkel, an der Eingangsrechnung mit den beiden
  Test-Mails aus bautakt-app#247 und am Ausgangsbeleg: Rechnung RE00001 festgeschrieben und
  an die Testadresse verschickt. Direkt danach stand „Versendet“, 30 Sekunden später ohne
  Neuladen „Zugestellt“.
