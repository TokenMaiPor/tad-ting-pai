// The receipt-stub toolbar injected under the chat input. Rendered in its own Shadow DOM.
import { t, type UiLang } from '../i18n';
import { h } from './dom';
import tokensCss from './tokens.css?inline';
import uiCss from './ui.css?inline';

export type StatusTone = 'info' | 'warn' | 'good';

export interface ToolbarHandlers {
  onCompress: () => void;
  onTranslate: () => void;
}

export interface Toolbar {
  /** `bar` sits under the chat box; `floating` is the fallback pinned near it (see DESIGN.md §10). */
  variant: ToolbarVariant;
  /** The element to insert into the host page. */
  host: HTMLElement;
  /** Shadow root, shared with the preview panel so both use the same styles. */
  root: ShadowRoot;
  setLang(lang: UiLang): void;
  /** `null` = still counting. */
  setCount(count: number | null): void;
  setTranslateVisible(visible: boolean): void;
  setBusy(action: 'compress' | 'translate' | null, label?: string): void;
  setStatus(message: string | null, tone?: StatusTone): void;
  /** Floating variant only: pin the button just above the chat box's top-right corner. */
  placeNear(rect: DOMRect): void;
  destroy(): void;
}

export type ToolbarVariant = 'bar' | 'floating';

export const TOOLBAR_HOST_TAG = 'tad-ting-pai';

export function createToolbar(
  initialLang: UiLang,
  handlers: ToolbarHandlers,
  variant: ToolbarVariant = 'bar',
): Toolbar {
  const host = document.createElement(TOOLBAR_HOST_TAG);
  host.setAttribute('data-ttp', 'toolbar');
  host.setAttribute('data-variant', variant);
  const floating = variant === 'floating';
  if (floating) {
    // Out of the site's layout entirely, so a DOM change on their side can't hide or break it.
    Object.assign(host.style, { position: 'fixed', zIndex: '2147483000', top: '0', left: '0' });
  }
  const root = host.attachShadow({ mode: 'open' });

  // Keep keystrokes inside our UI from reaching the host site's shortcut handlers.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }

  const style = h('style', { text: tokensCss + uiCss });
  const figure = h('span', { class: 'count-figure', 'data-ttp': 'count' });
  const note = h('span', { class: 'count-note' });
  const status = h('span', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const compressBtn = h('button', { type: 'button', class: 'btn', 'data-ttp': 'compress' });
  const translateBtn = h('button', {
    type: 'button',
    class: 'btn',
    'data-ttp': 'translate',
    hidden: true,
  });
  const bar = h(
    'div',
    { class: floating ? 'toolbar toolbar-floating' : 'toolbar', role: 'region' },
    floating ? null : h('span', { class: 'count' }, figure, note),
    status,
    h('div', { class: 'actions' }, compressBtn, floating ? null : translateBtn),
  );
  root.append(style, bar);

  let lang = initialLang;
  let count: number | null = null;
  let busy: 'compress' | 'translate' | null = null;
  let busyLabel: string | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;

  compressBtn.addEventListener('click', () => handlers.onCompress());
  translateBtn.addEventListener('click', () => handlers.onTranslate());

  function render() {
    bar.setAttribute('aria-label', t(lang, 'toolbar.region'));
    figure.textContent =
      count === null ? t(lang, 'toolbar.counting') : t(lang, 'toolbar.count', { n: count });
    note.textContent = t(lang, 'toolbar.estimate');
    note.title = t(lang, 'toolbar.estimateTitle');
    compressBtn.textContent = t(lang, floating ? 'toolbar.fallback' : 'toolbar.compress');
    if (floating) compressBtn.title = t(lang, 'toolbar.fallbackTitle');
    translateBtn.textContent =
      busy === 'translate'
        ? (busyLabel ?? t(lang, 'toolbar.translating'))
        : t(lang, 'toolbar.translate');
    compressBtn.disabled = busy !== null;
    translateBtn.disabled = busy !== null;
  }

  render();

  return {
    variant,
    host,
    root,
    setLang(next) {
      lang = next;
      render();
    },
    setCount(next) {
      count = next;
      render();
    },
    setTranslateVisible(visible) {
      translateBtn.hidden = !visible;
    },
    setBusy(action, label) {
      busy = action;
      busyLabel = label;
      render();
    },
    setStatus(message, tone = 'info') {
      clearTimeout(statusTimer);
      status.textContent = message ?? '';
      status.dataset.tone = tone;
      if (message) statusTimer = setTimeout(() => (status.textContent = ''), 6000);
    },
    placeNear(rect) {
      if (!floating) return;
      const width = host.offsetWidth || 160;
      const height = host.offsetHeight || 28;
      const gap = 8;
      const left = Math.min(Math.max(gap, rect.right - width), window.innerWidth - width - gap);
      // Above the chat box when there's room, otherwise just inside its top edge.
      const above = rect.top - height - gap;
      const top = above >= gap ? above : Math.max(gap, rect.top + gap);
      // top/left, not transform: a transformed host would trap the preview's fixed backdrop.
      host.style.left = `${Math.round(left)}px`;
      host.style.top = `${Math.round(top)}px`;
    },
    destroy() {
      clearTimeout(statusTimer);
      host.remove();
    },
  };
}
