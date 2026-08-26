import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

import base from './base.js';

/**
 * Basis plus React-spezifische Regeln. Fuer apps/app und packages/ui.
 *
 * Achtung bei react-hooks: `configs['recommended-latest']` ist in 7.1.1 trotz des
 * Namens noch eslintrc-geformt (plugins ist ein Array) und wird von der Flat
 * Config abgelehnt. Die Flat-Variante liegt unter `configs.flat`.
 */
export default [
  ...base,
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
];
