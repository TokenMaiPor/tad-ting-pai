// Content script for chatgpt.com, claude.ai and gemini.google.com.
// Mounts the toolbar under the chat box, keeps a live token estimate, and runs Compress /
// Translate through a before/after preview. It never submits a message: the only thing it
// ever does to the page is replace the chat box text after the user presses "Use this text".
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { adapterForHost, adapters, diagnose, getInputText, setInputText } from '../adapters';
import type { Diagnosis } from '../adapters';
import { isCompressRequest } from '../core/commands';
import { compress } from '../core/compress';
import {
  getSettings,
  onStorageChange,
  recordApply,
  saveSiteStatus,
  type Settings,
  type SiteStatus,
} from '../core/storage';
import { COUNT_MESSAGE, debounce, type CountRequest, type CountResponse } from '../core/tokens';
import { canTranslate, getTranslatorApi, translateMessage } from '../core/translate';
import { t } from '../i18n';
import { detectPack, languagePacks } from '../languages/registry';
import type { LanguagePack } from '../languages/types';
import { openPreview, type PreviewHandle } from '../ui/preview-panel';
import { createToolbar, type Toolbar, type ToolbarVariant } from '../ui/toolbar';

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  runAt: 'document_idle',

  async main(ctx) {
    const adapter = adapterForHost(adapters, location.hostname);
    if (!adapter) return;

    let settings: Settings = await getSettings();
    let toolbar: Toolbar | null = null;
    let input: HTMLElement | null = null;
    let preview: PreviewHandle | null = null;
    let lastCounted: string | null = null;

    // Checked in the background so the toolbar appears without waiting; the Translate button
    // shows up only once we know the browser can translate at least one supported language.
    const translatorApi = getTranslatorApi();
    const translatablePacks: LanguagePack[] = [];
    void Promise.all(
      languagePacks.map(async (pack) => {
        if (await canTranslate(translatorApi, pack.code)) translatablePacks.push(pack);
      }),
    ).then(() => toolbar?.setTranslateVisible(translatablePacks.length > 0));

    const lang = () => settings.uiLang;

    // The tokenizer takes a moment to load the first time; never let the UI wait forever.
    const COUNT_TIMEOUT_MS = 20_000;

    async function requestCounts(texts: string[]): Promise<number[] | null> {
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), COUNT_TIMEOUT_MS),
      );
      const request = browser.runtime
        .sendMessage({ type: COUNT_MESSAGE, texts } satisfies CountRequest)
        .then((response: CountResponse | undefined) =>
          response && response.counts.length === texts.length ? response.counts : null,
        )
        .catch(() => null); // extension reloaded or worker unavailable
      return Promise.race([request, timeout]);
    }

    /** Open the preview right away and fill in token counts when they arrive. */
    function showPreview(
      mode: 'compress' | 'translate',
      original: string,
      next: string,
      extra: { changes?: { label: string; count: number }[]; warning?: string },
    ) {
      if (!toolbar) return;
      const counts = requestCounts([original, next]).then((c) =>
        c && c[0] !== undefined && c[1] !== undefined ? { before: c[0], after: c[1] } : null,
      );
      preview?.close();
      const handle = openPreview({
        root: toolbar.root,
        lang: lang(),
        mode,
        before: original,
        after: next,
        ...extra,
        onApply: () => apply(original, next, counts),
        onCancel: () => undefined,
      });
      preview = handle;
      void counts.then((c) => handle.setCounts(c));
    }

    const updateCount = debounce(async () => {
      if (!toolbar || !input) return;
      const text = getInputText(input);
      if (text === lastCounted) return;
      lastCounted = text;
      const counts = await requestCounts([text]);
      if (lastCounted === text) toolbar.setCount(counts?.[0] ?? null);
    }, 250);

    function labelFor(
      rule: { label: { en: string; native: string } },
      pack: LanguagePack | undefined,
    ) {
      return pack && lang() === pack.code ? rule.label.native : rule.label.en;
    }

    function stillSame(original: string): boolean {
      return !!input && getInputText(input) === original;
    }

    function apply(
      original: string,
      next: string,
      counts: Promise<{ before: number; after: number } | null>,
    ) {
      if (!toolbar || !input) return;
      if (!stillSame(original)) {
        toolbar.setStatus(t(lang(), 'status.stale'), 'warn');
        return;
      }
      if (setInputText(input, next)) {
        toolbar.setStatus(t(lang(), 'status.applied'), 'good');
        // Savings are recorded once the counts are known (usually already).
        void counts.then((c) => {
          if (!c) return;
          void recordApply(c.before, c.after);
          toolbar?.setCount(c.after);
        });
      } else {
        toolbar.setStatus(t(lang(), 'status.writeFailed'), 'warn');
      }
    }

    async function onCompress() {
      if (!toolbar) return;
      if (!input) return toolbar.setStatus(t(lang(), 'status.inputNotFound'), 'warn');
      const original = getInputText(input);
      if (original.trim() === '') return toolbar.setStatus(t(lang(), 'status.empty'));

      const result = compress(original, { disabledRules: settings.disabledRules });
      if (result.aborted) return toolbar.setStatus(t(lang(), 'status.aborted'), 'warn');
      if (!result.changed) return toolbar.setStatus(t(lang(), 'status.nothingToCompress'));

      showPreview('compress', original, result.text, {
        changes: result.applied.map((r) => ({ label: labelFor(r, result.pack), count: r.count })),
      });
    }

    async function onTranslate() {
      if (!toolbar) return;
      if (!input) return toolbar.setStatus(t(lang(), 'status.inputNotFound'), 'warn');
      const original = getInputText(input);
      if (original.trim() === '') return toolbar.setStatus(t(lang(), 'status.empty'));

      const detected = detectPack(original);
      const pack = translatablePacks.find((p) => p.code === detected?.code) ?? translatablePacks[0];
      if (!translatorApi || !pack)
        return toolbar.setStatus(t(lang(), 'status.translateUnavailable'), 'warn');

      toolbar.setBusy('translate');
      try {
        const result = await translateMessage(original, {
          api: translatorApi,
          pack,
          appendReplyHint: settings.appendReplyHint,
          onDownloadProgress: (fraction) =>
            toolbar?.setBusy(
              'translate',
              t(lang(), 'toolbar.downloading', { p: Math.round(fraction * 100) }),
            ),
        });
        showPreview('translate', original, result.text, {
          warning: result.missingNumbers.length > 0 ? t(lang(), 'panel.numbersWarning') : undefined,
        });
      } catch {
        toolbar.setStatus(t(lang(), 'status.translateFailed'), 'warn');
      } finally {
        toolbar.setBusy(null);
      }
    }

    function unmount() {
      preview?.close();
      preview = null;
      toolbar?.destroy();
      toolbar = null;
      lastCounted = null;
    }

    // If the chat box is there but its usual container isn't (the site changed its markup),
    // wait a moment in case it is still rendering, then fall back to a floating button.
    const FALLBACK_DELAY_MS = 3_000;
    // Only report "chat box not found" once the page has had time to render it.
    const NOT_FOUND_DELAY_MS = 10_000;
    const startedAt = Date.now();
    let anchorMissingSince: number | null = null;
    let recheckTimer: ReturnType<typeof setTimeout> | undefined;
    let lastReported: string | null = null;

    function recheckIn(ms: number) {
      clearTimeout(recheckTimer);
      recheckTimer = setTimeout(() => ensureMounted(), ms);
    }

    function report(state: SiteStatus['state'], d: Diagnosis) {
      const key = `${state}|${d.inputSelector}|${d.anchorSelector}`;
      if (key === lastReported) return;
      lastReported = key;
      void saveSiteStatus(adapter!.id, {
        state,
        inputSelector: d.inputSelector,
        anchorSelector: d.anchorSelector,
        checkedAt: Date.now(),
      }).catch(() => undefined);
    }

    function useToolbar(variant: ToolbarVariant): Toolbar {
      if (toolbar && toolbar.variant !== variant) unmount();
      if (!toolbar) {
        toolbar = createToolbar(
          lang(),
          { onCompress: () => void onCompress(), onTranslate: () => void onTranslate() },
          variant,
        );
        toolbar.setTranslateVisible(translatablePacks.length > 0);
      }
      return toolbar;
    }

    function ensureMounted() {
      if (!settings.sites[adapter!.id]) return unmount();
      const d = diagnose(adapter!, document);
      if (!d.input) {
        const waited = Date.now() - startedAt;
        if (waited >= NOT_FOUND_DELAY_MS) report('not-found', d);
        else recheckIn(NOT_FOUND_DELAY_MS - waited);
        return;
      }
      if (d.input !== input) {
        input = d.input;
        lastCounted = null;
      }

      if (d.anchor) {
        anchorMissingSince = null;
        const bar = useToolbar('bar');
        if (d.anchor.nextElementSibling !== bar.host) d.anchor.after(bar.host);
        report('ok', d);
      } else {
        if (toolbar?.variant !== 'floating') {
          anchorMissingSince ??= Date.now();
          const waited = Date.now() - anchorMissingSince;
          if (waited < FALLBACK_DELAY_MS) return recheckIn(FALLBACK_DELAY_MS - waited);
        }
        const floating = useToolbar('floating');
        if (!floating.host.isConnected) document.body.append(floating.host);
        floating.placeNear(d.input.getBoundingClientRect());
        report('fallback', d);
      }
      updateCount();
    }

    // Chat sites are single-page apps: the composer is re-rendered on navigation, so watch
    // the DOM and re-attach when needed (batched to one check per animation frame).
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        ensureMounted();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    // The floating fallback follows the chat box when the page scrolls or resizes.
    const onViewportChange = () => {
      if (toolbar?.variant === 'floating') schedule();
    };
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('scroll', onViewportChange, { passive: true, capture: true });

    const onInput = (event: Event) => {
      if (input && event.target instanceof Node && input.contains(event.target)) updateCount();
    };
    document.addEventListener('input', onInput, true);

    // Keyboard shortcut (forwarded by the background worker): same as pressing Compress.
    const onMessage = (message: unknown, sender: { id?: string }) => {
      if (sender.id !== browser.runtime.id || !isCompressRequest(message) || !toolbar) return;
      void onCompress();
    };
    browser.runtime.onMessage.addListener(onMessage);

    const stopWatching = onStorageChange((change) => {
      if (!change.settings) return;
      settings = change.settings;
      toolbar?.setLang(lang());
      ensureMounted();
    });

    ctx.onInvalidated(() => {
      observer.disconnect();
      clearTimeout(recheckTimer);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, { capture: true });
      document.removeEventListener('input', onInput, true);
      stopWatching();
      browser.runtime.onMessage.removeListener(onMessage);
      updateCount.cancel();
      unmount();
    });

    ensureMounted();
  },
});
