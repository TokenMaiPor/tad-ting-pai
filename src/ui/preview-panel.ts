// Before/after preview. Nothing changes in the chat box until the user presses "Use this text".
import { t, type UiLang } from '../i18n';
import { h } from './dom';

export interface PreviewOptions {
  root: ShadowRoot;
  lang: UiLang;
  mode: 'compress' | 'translate';
  before: string;
  after: string;
  /** Omit while counting; fill in later with `setCounts`. */
  beforeTokens?: number;
  afterTokens?: number;
  /** Short human-readable list of what changed, e.g. "Removed polite particles ×3". */
  changes?: string[];
  warning?: string;
  onApply: () => void;
  onCancel: () => void;
}

export interface PreviewHandle {
  close(): void;
  /** Fill in token counts once the tokenizer has answered (null = could not count). */
  setCounts(counts: { before: number; after: number } | null): void;
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function openPreview(options: PreviewOptions): PreviewHandle {
  const { root, lang } = options;
  const titleId = 'ttp-panel-title';
  const counting = t(lang, 'panel.counting');
  const beforeFigure = h('span', { class: 'figure', text: counting });
  const afterFigure = h('span', { class: 'figure', text: counting });
  const stamp = h('span', {
    class: 'stamp',
    'data-tone': 'neutral',
    'data-ttp': 'delta',
    text: counting,
  });

  function setCounts(counts: { before: number; after: number } | null) {
    if (!counts) {
      beforeFigure.textContent =
        afterFigure.textContent =
        stamp.textContent =
          t(lang, 'panel.uncounted');
      return;
    }
    const delta = counts.before - counts.after;
    beforeFigure.textContent = t(lang, 'panel.tokens', { n: counts.before });
    afterFigure.textContent = t(lang, 'panel.tokens', { n: counts.after });
    stamp.dataset.tone = delta > 0 ? 'saved' : 'neutral';
    stamp.textContent =
      delta > 0
        ? t(lang, 'panel.saved', { n: delta })
        : delta < 0
          ? t(lang, 'panel.more', { n: -delta })
          : t(lang, 'panel.same');
  }

  const closeBtn = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-label': t(lang, 'panel.close'),
    text: '✕',
  });
  const copyBtn = h('button', { type: 'button', class: 'btn', text: t(lang, 'panel.copy') });
  const cancelBtn = h('button', {
    type: 'button',
    class: 'btn',
    'data-ttp': 'cancel',
    text: t(lang, 'panel.cancel'),
  });
  const applyBtn = h('button', {
    type: 'button',
    class: 'btn btn-primary',
    'data-ttp': 'apply',
    text: t(lang, 'panel.apply'),
  });

  const column = (label: string, figure: HTMLElement, text: string, testId: string) =>
    h(
      'section',
      { class: 'column', 'aria-label': label },
      h('div', { class: 'column-head' }, h('span', { text: label }), figure),
      h('pre', { class: 'text', tabindex: 0, 'data-ttp': testId, text }),
    );

  const changes =
    options.changes && options.changes.length > 0
      ? h(
          'ul',
          { class: 'changes', 'aria-label': t(lang, 'panel.changes') },
          ...options.changes.map((c) => h('li', { text: c })),
        )
      : null;

  const panel = h(
    'div',
    {
      class: 'panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      'data-ttp': 'panel',
    },
    h(
      'header',
      { class: 'panel-head' },
      h('h2', {
        class: 'panel-title',
        id: titleId,
        text: t(lang, options.mode === 'compress' ? 'panel.titleCompress' : 'panel.titleTranslate'),
      }),
      closeBtn,
    ),
    h(
      'div',
      { class: 'columns' },
      column(t(lang, 'panel.before'), beforeFigure, options.before, 'before'),
      column(t(lang, 'panel.after'), afterFigure, options.after, 'after'),
    ),
    options.warning ? h('p', { class: 'warning', role: 'note', text: options.warning }) : null,
    h('div', { class: 'receipt' }, changes ?? h('span'), stamp),
    h(
      'footer',
      { class: 'panel-foot' },
      h('p', { class: 'note', text: t(lang, 'panel.estimateNote') }),
      h('div', { class: 'actions' }, copyBtn, cancelBtn, applyBtn),
    ),
  );

  const backdrop = h('div', { class: 'backdrop' }, panel);
  const previouslyFocused = document.activeElement as HTMLElement | null;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    backdrop.remove();
    previouslyFocused?.focus?.();
  }

  function cancel() {
    close();
    options.onCancel();
  }

  closeBtn.addEventListener('click', cancel);
  cancelBtn.addEventListener('click', cancel);
  applyBtn.addEventListener('click', () => {
    close();
    options.onApply();
  });
  copyBtn.addEventListener('click', () => {
    void navigator.clipboard?.writeText(options.after).then(() => {
      copyBtn.textContent = t(lang, 'panel.copied');
    });
  });
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) cancel();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== 'Tab') return;
    // Focus trap: keep Tab cycling inside the dialog.
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = root.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (options.beforeTokens !== undefined && options.afterTokens !== undefined) {
    setCounts({ before: options.beforeTokens, after: options.afterTokens });
  }

  root.append(backdrop);
  applyBtn.focus();

  return { close, setCounts };
}
