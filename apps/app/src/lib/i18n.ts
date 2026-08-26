import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import auth from '@/locales/de/auth.json';
import common from '@/locales/de/common.json';
import domain from '@/locales/de/domain.json';
import errors from '@/locales/de/errors.json';
import validation from '@/locales/de/validation.json';

/**
 * i18next mit ausschliesslich deutschem Katalog.
 *
 * Die Mehrsprachigkeit ist verdrahtet, aber nur `de` wird gepflegt. Der Punkt
 * ist die Regel, nicht die Sprachanzahl: sichtbare Strings laufen ab dem ersten
 * Commit ueber Keys. In bautakt-app wurde nachtraeglich umgestellt, und der
 * i18n:scan dort meldet bis heute Reste.
 *
 * Kein Language-Detector: solange es nur `de` gibt, waere er nur eine
 * Fehlerquelle.
 *
 * Kein generierter locales/index.ts wie in der Mobile-App — den braucht es dort
 * nur, weil Metro dynamische Import-Pfade nicht aufloesen kann. Vite kann das.
 */
export const defaultNS = 'common';

void i18next.use(initReactI18next).init({
  lng: 'de',
  fallbackLng: 'de',
  defaultNS,
  ns: ['common', 'auth', 'domain', 'errors', 'validation'],
  resources: {
    de: { common, auth, domain, errors, validation },
  },
  interpolation: { escapeValue: false },
});

export default i18next;
