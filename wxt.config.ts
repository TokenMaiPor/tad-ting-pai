import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'TadTingPai',
    description:
      'Use fewer tokens on ChatGPT, Claude and Gemini when you write in Thai. Runs locally. Nothing leaves your device.',
    // Only local storage. Site access comes from the content script matches.
    permissions: ['storage'],
    minimum_chrome_version: '120',
    // Icons live in public/icon/ and are copied to the build as-is.
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'TadTingPai',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  },
  vite: () => ({
    build: {
      // Chrome supports modulepreload natively. Vite's polyfill uses fetch(), which would
      // trip our "no network APIs in the bundle" audit (scripts/audit-network.mjs).
      modulePreload: { polyfill: false },
    },
  }),
});
