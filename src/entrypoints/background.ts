import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { COMPRESS_COMMAND, COMPRESS_MESSAGE, type CompressRequest } from '../core/commands';
import { createTokenCounter, isCountRequest, loadO200k, type CountResponse } from '../core/tokens';

export default defineBackground(() => {
  // The tokenizer is loaded on the first count and kept while the worker is alive.
  const count = createTokenCounter(loadO200k);

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    // Only answer our own content scripts and pages.
    if (sender.id !== browser.runtime.id || !isCountRequest(message)) return undefined;
    // A chat page just opened (its first request is usually the empty box): start loading the
    // tokenizer now, so it is ready by the time the user has typed something.
    void count(' ').catch(() => undefined);
    Promise.all(message.texts.map((text) => count(text)))
      .then((counts) => sendResponse({ counts } satisfies CountResponse))
      .catch(() => sendResponse({ counts: [] } satisfies CountResponse));
    return true; // keep the channel open for the async response
  });

  // Keyboard shortcut → the active tab's content script. Tabs without our content script
  // (any non-chat page) simply have no receiver, which is fine.
  browser.commands.onCommand.addListener((command, tab) => {
    if (command !== COMPRESS_COMMAND) return;
    void (async () => {
      const target =
        tab?.id !== undefined
          ? tab
          : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (target?.id === undefined) return;
      await browser.tabs
        .sendMessage(target.id, { type: COMPRESS_MESSAGE } satisfies CompressRequest)
        .catch(() => undefined);
    })();
  });
});
