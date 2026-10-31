import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { prepareCompanyLogo } from './svgLogo';

/** Bucket `company-images`. Raster bleibt JPEG, SVG liegt als `.svg` neben der PNG. */
const LOGO_BUCKET = 'company-images';
const SIGNED_URL_SECONDS = 3600;

const isStoragePath = (value: string | null | undefined): value is string =>
  Boolean(value?.trim()) && !/^https?:\/\//.test(value!);

/**
 * Zur PNG in `logo_image_url` gehörende SVG, gleicher Dateiname.
 * Alte JPEG-Logos haben keine Schwesterdatei.
 */
export function logoVectorSibling(path: string | null | undefined): string | null {
  if (!isStoragePath(path) || !path.endsWith('.png')) return null;
  return `${path.slice(0, -4)}.svg`;
}

/** Gespeicherter Pfad plus, bei einer PNG-Fassung, die SVG daneben. */
export function logoFilesToRemove(path: string | null | undefined): string[] {
  if (!isStoragePath(path)) return [];
  if (path.endsWith('.png')) return [path, `${path.slice(0, -4)}.svg`];
  if (path.endsWith('.svg')) return [path, `${path.slice(0, -4)}.png`];
  return [path];
}

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
 * dann die alte Datei löschen. Schlägt das Löschen fehl, bleibt nur eine
 * verwaiste Datei, nie ein Betrieb ohne Logo.
 *
 * `logo_image_url` zeigt immer auf JPEG oder PNG. Eine SVG wird zusätzlich
 * als `image/svg+xml` abgelegt; die Spalte behält die PNG, weil Renderer und
 * App nur Raster lesen. Die Ansicht lädt die SVG über `<img>`.
 */
export function useCompanyLogo() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async ({ file, previous }: { file: File | null; previous: string | null }) => {
      let path: string | null = null;
      if (file) {
        const prepared = await prepareCompanyLogo(file);
        const id = crypto.randomUUID();
        if (prepared.kind === 'svg') {
          const svgPath = `${companyId}/logo/${id}.svg`;
          const pngPath = `${companyId}/logo/${id}.png`;
          const svgUpload = await supabase.storage.from(LOGO_BUCKET).upload(svgPath, prepared.svg, {
            contentType: 'image/svg+xml',
            upsert: true,
          });
          if (svgUpload.error) throw svgUpload.error;
          const pngUpload = await supabase.storage.from(LOGO_BUCKET).upload(pngPath, prepared.png, {
            contentType: 'image/png',
            upsert: true,
          });
          if (pngUpload.error) {
            await supabase.storage.from(LOGO_BUCKET).remove([svgPath]);
            throw pngUpload.error;
          }
          path = pngPath;
        } else {
          path = `${companyId}/logo/${id}.jpg`;
          const { error } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(path, prepared.blob, { contentType: 'image/jpeg', upsert: true });
          if (error) throw error;
        }
      }
      const { error } = await supabase
        .from('companies')
        .update({ logo_image_url: path })
        .eq('id', companyId!);
      if (error) {
        if (path) await supabase.storage.from(LOGO_BUCKET).remove(logoFilesToRemove(path));
        throw error;
      }
      if (isStoragePath(previous) && previous !== path) {
        await supabase.storage.from(LOGO_BUCKET).remove(logoFilesToRemove(previous));
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['company-setup-status', companyId] }),
      ]),
  });
}
