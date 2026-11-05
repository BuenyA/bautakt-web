# 2026-11-05 Angebote: Liste und Detailseite (web#291)

- Liste mit Filtern nach Status und Art (`?status=`, `?art=`), vier Kennzahlen und CSV über
  `DataTable`. Detailseite mit Überblick, Versionen, Verlauf und Anhängen.
- Route `/angebote/vorgaenge` statt `/angebote`, weil die alte Liste bis 1c bleibt.
- Typen vorläufig aus einem lokalen Stack mit der Migration erzeugt und nur die
  Angebotseinträge übernommen. Nach dem Einspielen auf Production neu erzeugen.
- Vor der Migration im Browser gegen einen lokalen Stack geprüft (Production-Schema ohne
  Daten, Migration, Testdaten über die echten RPCs): Direktaufruf ohne Recht zeigt „Kein
  Zugriff“, ein fremder Betrieb sieht „nicht gefunden“, Filter und Hard-Reload halten,
  nach Nutzerwechsel keine Daten des vorigen Betriebs.
- Entwürfe zeigen „Noch nicht berechnet“ statt 0,00 €: `save_quote_draft` rechnet keine
  Summen, erst `issue_quote_version`. Der Editor in 1c zeigt die laufende Summe.
