import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';

export type MyProfile = {
  /** Vor- und Nachname, leer, wenn keiner gepflegt ist. */
  name: string;
  /** Pfad im Bucket `profile-images` oder eine URL; siehe `useProfileImageUrls`. */
  imagePath: string | null;
};

/** Name und Profilbild der angemeldeten Person, für das Menü unten links. */
export function useMyProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, profile_image_url')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      const name = [data?.first_name, data?.last_name]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ');
      return { name, imagePath: data?.profile_image_url || null };
    },
  });
}
