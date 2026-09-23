import { defineConfig } from '@playwright/test';

// End-to-end smoke tests: load the built extension into Chromium and drive it on local
// copies of each chat site's composer (tests/fixtures). No real network access is used.
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
});
