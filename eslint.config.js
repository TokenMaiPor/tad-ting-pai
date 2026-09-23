import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Dot-folders are build output or local tool config, never project source.
    ignores: ['.*/**', 'node_modules/**', 'coverage/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Privacy guarantee: the extension must never talk to the network.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'TadTingPai makes no network calls.' },
        { name: 'XMLHttpRequest', message: 'TadTingPai makes no network calls.' },
        { name: 'WebSocket', message: 'TadTingPai makes no network calls.' },
        { name: 'EventSource', message: 'TadTingPai makes no network calls.' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.*'],
    rules: { 'no-restricted-globals': 'off' },
  },
);
