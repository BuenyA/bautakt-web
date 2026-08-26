import react from '@bautakt/eslint-config/react';
import reactRefresh from 'eslint-plugin-react-refresh';

// react-refresh nur hier: es ist eine Vite-HMR-Regel, siehe @bautakt/eslint-config/react.
const eslintConfig = [...react, reactRefresh.configs.vite, { ignores: ['dist/**'] }];

export default eslintConfig;
