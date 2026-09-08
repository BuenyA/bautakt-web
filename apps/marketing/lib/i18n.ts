import { createInstance } from 'i18next';

import { de } from '@/content/de';

const translations = createInstance();
void translations.init({
  lng: 'de',
  fallbackLng: 'de',
  initImmediate: false,
  resources: { de: { site: de } },
  interpolation: { escapeValue: false },
});
export const t = translations.t.bind(translations);
