# 2026-11-04 Umleitung über IONOS: Freigabeliste braucht die Lieferanten (#289)

Bisher stand in der Hilfe nur, dass manche Anbieter beim Weiterleiten den Absender ändern. Für IONOS ist das jetzt mit einer
echten Mail geprüft.

- **Ergebnis:** Mit der IONOS-Regel „Umleiten nach“ kam die Mail unter dem ursprünglichen Absender an, nicht unter der
  Adresse des Betriebs. SPF, DKIM und DMARC waren `pass`. Der Owner hat den Test am 04.11.2026 gefahren, Beleg im Kommentar an #289.
- **Folge:** In die Freigabeliste gehören die Lieferanten. Die Hilfe sagt das jetzt für IONOS.
- **Unbelegt:** Gmail und andere Anbieter. Google hat die Bot-Nutzung des Testkontos erkannt, deshalb gab es dort keinen Test.
  Die Hilfe nennt das und verweist auf die abgewiesenen Mails.
- **Nur eine Regelart:** Geprüft ist „Umleiten nach“, nicht eine andere Art der IONOS-Weiterleitung.
