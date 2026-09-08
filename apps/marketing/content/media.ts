/** Alle Personenmotive werden nach der Alterskorrektur neu produziert. */
export type SceneName = 'intro' | 'chaos' | 'clarity' | 'finish';
export const media: Record<SceneName, { poster?: string; video?: string }> = {
  intro: {},
  chaos: {},
  clarity: {},
  finish: {},
};
