type ProfileName = {
  first_name: string | null;
  last_name: string | null;
} | null;

/**
 * Anzeigename eines Mitarbeiters: display_* auf der Beschäftigung zuerst,
 * sonst Vor-/Nachname aus dem Profil.
 */
export function employmentDisplayName(row: {
  display_first_name?: string | null;
  display_last_name?: string | null;
  profiles?: ProfileName;
}): string {
  const display = [row.display_first_name, row.display_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  if (display) return display;

  const profile = row.profiles;
  if (!profile) return '';
  return [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}
