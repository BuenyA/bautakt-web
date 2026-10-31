-- company-images: SVG-Logo und die PNG-Fassung fürs PDF.
--
-- Gemessen 2026-10-30 am Projekt bxivzvmlcnaxqlytumvz:
--   allowed_mime_types = {image/jpeg}
--   file_size_limit    = 5242880
--
-- Die Web-App speichert ein SVG-Logo als image/svg+xml und daneben eine
-- hochauflösende PNG (image/png). companies.logo_image_url zeigt weiter auf
-- die Rasterdatei. JPEG bleibt erlaubt.
--
-- Nicht geändert: file_size_limit, public, und keine Policy auf storage.objects.
--
-- Diese Datei ist nur die Migration. Sie ist nicht angewendet.
-- Vor Merge und Deploy auf das Projekt anwenden, sonst lehnt der Bucket
-- image/svg+xml und image/png ab.

update storage.buckets
set allowed_mime_types = (
  select array(
    select distinct mime
    from unnest(
      coalesce(allowed_mime_types, array[]::text[])
      || array['image/jpeg', 'image/png', 'image/svg+xml']::text[]
    ) as mime
    order by 1
  )
)
where id = 'company-images';
