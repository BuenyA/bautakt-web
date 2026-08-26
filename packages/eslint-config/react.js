import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

import base from './base.js';

/**
 * Basis plus React-Regeln. Gilt fuer alles, was React enthaelt — Apps wie
 * Bibliothekspakete.
 *
 * react-refresh ist bewusst NICHT hier: das ist eine Vite-HMR-Regel und
 * verlangt, dass eine Datei ausser Komponenten nichts exportiert. Fuer ein
 * Bibliothekspaket ist das falsch (shadcn exportiert neben <Button> auch
 * buttonVariants). Die Regel steht deshalb nur in apps/app.
 *
 * Achtung bei react-hooks: `configs['recommended-latest']` ist in 7.1.1 trotz
 * des Namens noch eslintrc-geformt (plugins ist ein Array) und wird von der
 * Flat Config abgelehnt. Die Flat-Variante liegt unter `configs.flat`.
 */
export default [
  ...base,
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat['recommended-latest'],
];
