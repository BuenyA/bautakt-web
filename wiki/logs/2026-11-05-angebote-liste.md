# 2026-11-05 Angebote: Liste und Detailseite (web#291)

- Liste mit Filtern nach Status und Art (`?status=`, `?art=`), vier Kennzahlen und CSV über
  `DataTable`. Detailseite mit Überblick, Versionen, Verlauf und Anhängen.
- Route `/angebote/vorgaenge` statt `/angebote`, weil die alte Liste bis 1c bleibt.
- Typen vorläufig aus einem lokalen Stack mit der Migration erzeugt und nur die
  Angebotseinträge übernommen. Nach dem Einspielen auf Production neu erzeugen.
- Offen bis zur Migration: Prüfung im Browser mit echten Daten, Direktaufruf ohne Recht,
  Hard-Reload, Nutzerwechsel, Screenshots hell und dunkel.
