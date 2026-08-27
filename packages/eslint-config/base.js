import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Gemeinsame Basis fuer alle Workspaces.
 *
 * Import-Sortierung ist bewusst erzwungen: in bautakt-app ist sie es nicht, und
 * dort ist die Reihenfolge entsprechend von Datei zu Datei verschieden. Die
 * Regel ist vollstaendig autofixbar (`eslint --fix`).
 *
 * `eslint-config-prettier` steht immer zuletzt und schaltet alle Regeln ab, die
 * mit dem Formatter kollidieren wuerden.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      '**/database.types.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Ungenutzte Variablen sind ein Fehler, ausser sie beginnen mit _
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
);
