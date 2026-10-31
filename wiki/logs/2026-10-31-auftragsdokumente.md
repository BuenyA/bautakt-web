# 2026-10-31 Auftrag: Dokumente

Dritter und letzter Schritt der neuen Auftragsseite (siehe
[auftragsseite.md](../pages/auftragsseite.md#dokumente)).

- Reiter „Dokumente“ (`/auftraege/:id/dokumente`) und Vorschau-Karte mit den
  drei neuesten Dateien. Daten wie in der Handy-App: `order_documents` mit
  den Ordnern aus `order_document_categories`.
- Hochladen in einen wählbaren Ordner, umbenennen, verschieben, löschen.
  Archivierte Rechnungen und Angebote öffnen aus `finance-documents`; Löschen
  entfernt dort nur die Verknüpfung.
- Die Ablegefläche der Fotos heißt jetzt `FileDropzone` und liegt unter
  `components/common`; Typen und Texte kommen vom Aufrufer.
- Fallstrick beim Upload: supabase-js nimmt bei einer Datei deren eigenen
  Typ, nicht `contentType`. Word kommt aus dem Browser oft ohne Typ und wäre
  vom Bucket abgewiesen worden.
- Zwei Gedankenstriche aus den neuen Texten von gestern entfernt
  (`orders.finance.noContract`), passend zur Regel aus `main`.

Im Browser mit Testdaten geprüft (Desktop, 420 px, Bearbeiten, Upload mit
einer erlaubten und einer abgelehnten Datei). Gegen echte Daten nicht:
Stand 2026-10-31 gibt es keine Zeile in `order_documents`.
