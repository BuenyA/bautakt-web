import { supabase } from '@/lib/supabase';

/**
 * Betriebsanlage wie in der Mobile-App.
 *
 * Vorbild: `bautakt-app` `app/lib/supabase/companies.ts` (`createCompany`,
 * `setAsPrimary` true) und `app/lib/onboarding/commitDraft.ts`
 * (`createCompanyFromDraft`). Adresse und Kontakt bleiben leer; das Land ist
 * `DE`. Die Rolle der ersten Beschaeftigung ist `Geschäftsführer`.
 *
 * `onboarding_complete` setzt die App erst auf dem Willkommensscreen
 * (`setOnboardingCompleted` → Outbox `profile.onboarding`). Dieselbe Spalte
 * schreibt das Web direkt, bevor es auf die Uebersicht geht. Seed-RPCs ruft
 * die App dabei nicht auf; das erledigen die AFTER-INSERT-Trigger auf
 * `companies`.
 */

export const COMPANY_TEAM_SIZES = ['solo', 'small', 'medium', 'large'] as const;

export type CompanyTeamSize = (typeof COMPANY_TEAM_SIZES)[number];

export type OwnerCompanyInput = {
  name: string;
  type: string;
  teamSize: CompanyTeamSize;
};

const OWNER_ROLE = 'Geschäftsführer';

export function isCompanyTeamSize(value: string): value is CompanyTeamSize {
  return (COMPANY_TEAM_SIZES as readonly string[]).includes(value);
}

/**
 * Namen und Geburtsdatum, bevor die Firma entsteht. `language` bleibt
 * unangetastet. `.select('id')` macht ein von RLS verschlucktes Update zum
 * Fehler, statt still weiter die Firma anzulegen.
 */
export async function updateOwnerProfile(
  userId: string,
  profile: { firstName: string; lastName: string; birthday: string },
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: profile.firstName.trim(),
      last_name: profile.lastName.trim(),
      birthday: profile.birthday,
    })
    .eq('id', userId)
    .select('id')
    .single();

  if (error) throw error;
}

export async function createOwnerCompany(userId: string, input: OwnerCompanyInput) {
  const { data, error } = await supabase
    .from('companies')
    .insert([
      {
        name: input.name.trim(),
        type: input.type.trim(),
        street_address: '',
        postal_code: '',
        city: '',
        country: 'DE',
        email: '',
        phone_number: '',
        team_size: input.teamSize,
        creator_id: userId,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  const { error: resetPrimaryError } = await supabase
    .from('employments')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);

  if (resetPrimaryError) throw resetPrimaryError;

  const { error: employmentError } = await supabase.from('employments').insert([
    {
      user_id: userId,
      company_id: data.id,
      role: OWNER_ROLE,
      is_primary: true,
    },
  ]);

  if (employmentError) throw employmentError;

  return data;
}

/** Dieselbe Wirkung wie `setOnboardingCompleted` in der App. */
export async function markOnboardingComplete(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_complete: true })
    .eq('id', userId);

  if (error) throw error;
}
