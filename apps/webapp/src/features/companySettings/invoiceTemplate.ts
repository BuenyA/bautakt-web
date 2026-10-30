import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { resizeImageToJpeg } from '@/lib/imageResize';
import { supabase } from '@/lib/supabase';

/** Wie die App: 512 px Kantenlänge, JPEG 0,8, Bucket `company-images`. */
const LOGO_BUCKET = 'company-images';
const LOGO_MAX_DIMENSION = 512;
const LOGO_QUALITY = 0.8;
const SIGNED_URL_SECONDS = 3600;

const isStoragePath = (value: string | null | undefined): value is string =>
  Boolean(value?.trim()) && !/^https?:\/\//.test(value!);

/** Anzeigbare URL des Logos (privater Bucket, signiert). */
export function useCompanyLogoUrl(path: string | null | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-logo-url', companyId, path],
    enabled: Boolean(companyId && path),
    staleTime: (SIGNED_URL_SECONDS - 300) * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      if (!isStoragePath(path)) return path;
      const { data, error } = await supabase.storage
        .from(LOGO_BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/**
 * Logo setzen oder entfernen. Erst hochladen, dann die Spalte umstellen,
 * dann die alte Datei löschen — schlägt das Löschen fehl, bleibt nur eine
 * verwaiste Datei, nie ein Betrieb ohne Logo.
 */
export function useCompanyLogo() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async ({ file, previous }: { file: File | null; previous: string | null }) => {
      let path: string | null = null;
      if (file) {
        const blob = await resizeImageToJpeg(file, LOGO_MAX_DIMENSION, LOGO_QUALITY);
        path = `${companyId}/logo/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from(LOGO_BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
      }
      const { error } = await supabase
        .from('companies')
        .update({ logo_image_url: path })
        .eq('id', companyId!);
      if (error) throw error;
      if (isStoragePath(previous) && previous !== path) {
        await supabase.storage.from(LOGO_BUCKET).remove([previous]);
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['company-setup-status', companyId] }),
      ]),
  });
}
