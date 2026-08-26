import react from '@bautakt/eslint-config/react';

const eslintConfig = [...react, { ignores: ['dist/**'] }];

export default eslintConfig;
