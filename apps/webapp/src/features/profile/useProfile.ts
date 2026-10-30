import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { resizeImageToJpeg } from '@/lib/imageResize';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

export type ProfileDetails = {
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` oder leer. */
  birthday: string;
  language: string;
  imagePath: string | null;
};

/** Die eigene Zeile in `profiles` — schreiben darf jeder nur sich selbst (RLS). */
export function useProfileDetails() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['my-profile', userId, 'details'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfileDetails> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, birthday, language, profile_image_url')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return {
        firstName: data?.first_name ?? '',
        lastName: data?.last_name ?? '',
        birthday: data?.birthday ?? '',
        language: data?.language || 'de',
        imagePath: data?.profile_image_url || null,
      };
    },
  });
}

/** Alles unter `['my-profile', userId]` neu laden: Menü, Formular, Avatar. */
function useInvalidateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () => queryClient.invalidateQueries({ queryKey: ['my-profile', user?.id] });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async (patch: {
      first_name?: string;
      last_name?: string;
      birthday?: string | null;
      language?: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...patch, modified_at: new Date().toISOString() })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Wie die App: 400 px Kantenlänge, JPEG 0,75, Bucket `profile-images`. */
const BUCKET = 'profile-images';
const MAX_DIMENSION = 400;
const QUALITY = 0.75;

const isStoragePath = (value: string | null | undefined): value is string =>
  Boolean(value?.trim()) && !/^https?:\/\//.test(value!);

/**
 * Profilbild setzen oder entfernen, in der Reihenfolge der App: hochladen,
 * Spalte umstellen, alte Datei löschen. Die Storage-Policy erlaubt nur den
 * eigenen Ordner (`{userId}/…`).
 */
export function useProfileImage() {
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({ file, previous }: { file: File | null; previous: string | null }) => {
      const userId = user!.id;
      let path: string | null = null;
      if (file) {
        const blob = await resizeImageToJpeg(file, MAX_DIMENSION, QUALITY);
        path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: path, modified_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      if (isStoragePath(previous) && previous !== path) {
        // Eine verwaiste Datei ist kein Fehler für den Nutzer.
        await supabase.storage.from(BUCKET).remove([previous]);
      }
    },
    onSuccess: async () => {
      await invalidate();
      // Mitarbeiterlisten zeigen das Bild ebenfalls.
      await queryClient.invalidateQueries({ queryKey: ['employees', membership?.companyId] });
    },
  });
}

/**
 * E-Mail-Adresse ändern. Supabase schickt eine Bestätigung an die neue
 * Adresse (je nach Projekt-Einstellung auch an die alte); erst danach gilt
 * sie. Der Link führt zurück in die App.
 */
export function useChangeEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}${routes.profileAccount}` },
      );
      if (error) throw error;
    },
  });
}

export const FEEDBACK_CATEGORIES = ['general', 'improvement', 'feature', 'bug'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** Feedback in dieselbe Tabelle wie die App, mit `platform = 'web'`. */
export function useSubmitFeedback() {
  const { user } = useAuth();
  const { data: membership } = useMembership();
  return useMutation({
    mutationFn: async (input: { category: FeedbackCategory; message: string }) => {
      const { error } = await supabase.from('feedback').insert([
        {
          user_id: user!.id,
          company_id: membership?.companyId ?? null,
          category: input.category,
          message: input.message.trim(),
          platform: 'web',
        },
      ]);
      if (error) throw error;
    },
  });
}
