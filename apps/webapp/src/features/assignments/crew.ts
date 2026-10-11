import { employmentDisplayName } from '@/lib/employeeName';

/** Wer bei einem Einsatz dabei ist, mit Profilbild für die Gesichter. */
export type CrewMember = {
  employmentId: string;
  name: string;
  /** Pfad im Bucket `profile-images` oder schon eine URL. */
  imagePath: string | null;
};

export type EmploymentJoin = {
  display_first_name: string | null;
  display_last_name: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  } | null;
} | null;

/** Spalten einer Beschäftigung samt Profil, für PostgREST-Joins. */
export const EMPLOYMENT_SELECT =
  'display_first_name, display_last_name, profiles ( first_name, last_name, profile_image_url )';

export function crewMember(employmentId: string, employment: EmploymentJoin): CrewMember {
  return {
    employmentId,
    name: employment ? employmentDisplayName(employment) : '',
    imagePath: employment?.profiles?.profile_image_url ?? null,
  };
}

/** Nach Namen sortiert, damit die Gesichter überall in derselben Reihenfolge stehen. */
export function sortCrew(crew: readonly CrewMember[]): CrewMember[] {
  return [...crew].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
