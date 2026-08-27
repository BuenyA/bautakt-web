import next from '@bautakt/eslint-config/next';

const eslintConfig = [...next, { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] }];

export default eslintConfig;
