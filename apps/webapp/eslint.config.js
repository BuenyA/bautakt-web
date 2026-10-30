import react from '@bautakt/eslint-config/react';
import reactRefresh from 'eslint-plugin-react-refresh';

// react-refresh nur hier: es ist eine Vite-HMR-Regel, siehe @bautakt/eslint-config/react.
const eslintConfig = [
  ...react,
  reactRefresh.configs.vite,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/form/Combobox.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@fluentui/react-components',
              importNames: ['Combobox'],
              message:
                'Combobox aus @/components/form/Combobox nehmen (Liste immer unter dem Feld).',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['dist/**'] },
];

export default eslintConfig;
