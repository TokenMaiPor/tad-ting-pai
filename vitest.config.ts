import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/protect/**', 'src/core/**', 'src/languages/**'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        'src/protect/**': { lines: 100, functions: 100, branches: 95, statements: 100 },
      },
    },
  },
});
