import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

const BUCKET = 'profile-images';
/** Eine Stunde, wie `PROFILE_IMAGE_SIGNED_URL_SECONDS` in der App. */
const SIGNED_URL_SECONDS = 3600;

/**
 * Profilbilder als anzeigbare URLs, Schlüssel ist der gespeicherte Pfad.
 *
 * `profiles.profile_image_url` enthält trotz des Namens meist einen Pfad
 * (`{userId}/{uuid}.jpg`) im privaten Bucket, keine URL. Solche Pfade
 * werden in einem Rutsch signiert; echte URLs gehen unverändert durch.
 * Die Storage-Policy lässt nur Bilder von Kollegen derselben Firma zu.
 */
export function useProfileImageUrls(paths: readonly (string | null | undefined)[]) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))].sort();

  return useQuery({
    queryKey: ['profile-image-urls', companyId, unique],
    enabled: Boolean(companyId) && unique.length > 0,
    // Kurz vor Ablauf neu signieren, nicht erst nach einem kaputten Bild.
    staleTime: (SIGNED_URL_SECONDS - 300) * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const urls: Record<string, string> = {};
      const storagePaths = unique.filter((path) => !/^https?:\/\//.test(path));
      for (const path of unique) if (!storagePaths.includes(path)) urls[path] = path;

      if (storagePaths.length > 0) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(storagePaths, SIGNED_URL_SECONDS);
        if (error) throw error;
        for (const entry of data ?? []) {
          if (entry.path && entry.signedUrl) urls[entry.path] = entry.signedUrl;
        }
      }
      return urls;
    },
  });
}
