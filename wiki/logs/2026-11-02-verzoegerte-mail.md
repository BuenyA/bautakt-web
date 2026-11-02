# 2026-11-02 Verzögerte Mail nach 72 Stunden (#278)

Lettermint meldet nach einem Soft-Bounce nicht sicher ein Ergebnis. Der Status „Verzögert“
kann also dauerhaft stehen bleiben.

- `staleDeferredMails` (`mailDelivery.ts`) findet verzögerte Mails, deren Versand mindestens
  72 Stunden zurückliegt. Die Anzeige wird zu „Verzögert seit <Versandzeit>“ mit einem Hinweis
  zum Prüfen.
- Es gibt keinen Sprung auf „Nicht zustellbar“. Eine spätere endgültige Meldung ersetzt die
  Anzeige, eine später zugestellte Mail zum selben Beleg erledigt den Hinweis.
- Mails ganz ohne Rückmeldung bleiben „Versendet“, sonst bekäme jede Mail von vor dem Webhook
  eine Warnung.
