import base from '@bautakt/eslint-config/base';

// `src/core` ist eine wörtliche Kopie aus bautakt-app (Deno-Stil) und wird
// dort gepflegt, nicht hier.
const eslintConfig = [{ ignores: ['src/core/**'] }, ...base];

export default eslintConfig;
