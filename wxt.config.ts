import { defineConfig } from 'wxt';
import { COMPRESS_COMMAND, COMPRESS_SHORTCUT } from './src/core/commands';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'TadTingPai',
    description:
      'Use fewer tokens on ChatGPT, Claude and Gemini in Thai, Vietnamese or Indonesian. Runs locally. Nothing leaves your device.',
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
    // A keyboard shortcut is not a permission; it only opens the preview on the current chat tab.
    commands: {
      [COMPRESS_COMMAND]: {
        suggested_key: { default: COMPRESS_SHORTCUT },
        description: 'Compress the message in the chat box (opens the preview)',
      },
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
