import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    ignores: ['coverage/**', 'jest/test-results/**', 'jest-api/test-results/**'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      '@next/next/no-img-element': 'off',
      'react/display-name': 'warn',
      'react/no-children-prop': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
]);
