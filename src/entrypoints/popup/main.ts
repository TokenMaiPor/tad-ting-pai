import { formatNumber, t, type UiLang } from '../../i18n';
import {
  getSettings,
  getStats,
  onStorageChange,
  resetStats,
  saveSettings,
  type Settings,
  type SiteId,
  type Stats,
} from '../../core/storage';
import { h } from '../../ui/dom';

const SITES: { id: SiteId; label: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
];

const app = document.querySelector<HTMLElement>('#app');
let settings: Settings;
let stats: Stats;
let resetArmed = false;

function render() {
  if (!app) return;
  const lang: UiLang = settings.uiLang;
  document.documentElement.lang = lang;

  const siteBoxes = SITES.map((site) => {
    const input = h('input', { type: 'checkbox', checked: settings.sites[site.id] });
    input.addEventListener('change', () => {
      void saveSettings({ sites: { ...settings.sites, [site.id]: input.checked } });
    });
    return h('label', { class: 'check' }, input, h('span', { text: site.label }));
  });

  const replyHint = h('input', { type: 'checkbox', checked: settings.appendReplyHint });
  replyHint.addEventListener(
    'change',
    () => void saveSettings({ appendReplyHint: replyHint.checked }),
  );

  const langOption = (value: UiLang, label: string) => {
    const input = h('input', {
      type: 'radio',
      name: 'ui-lang',
      value,
      checked: settings.uiLang === value,
    });
    input.addEventListener('change', () => void saveSettings({ uiLang: value }));
    return h('label', { lang: value }, input, h('span', { text: label }));
  };

  const resetBtn = h('button', {
    type: 'button',
    class: 'btn',
    'data-armed': resetArmed,
    text: t(lang, resetArmed ? 'popup.resetConfirm' : 'popup.reset'),
  });
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      render();
      return;
    }
    resetArmed = false;
    void resetStats();
  });

  app.replaceChildren(
    h('h1', { class: 'wordmark' }, 'Tad', h('span', { class: 'cut', text: 'Ting' }), 'Pai'),
    h(
      'section',
      { class: 'hero', 'aria-live': 'polite' },
      h('span', {
        class: 'hero-figure',
        'data-ttp': 'saved-total',
        text: formatNumber(stats.tokensSaved, lang),
      }),
      h('span', { class: 'hero-label', text: t(lang, 'popup.saved') }),
      h('p', { class: 'muted', text: t(lang, 'popup.savedNote') }),
      h('p', { class: 'muted', text: t(lang, 'popup.uses', { n: stats.applyCount }) }),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', { text: t(lang, 'popup.settings') }),
      h('fieldset', {}, h('legend', { text: t(lang, 'popup.sites') }), ...siteBoxes),
      h(
        'fieldset',
        {},
        h('label', { class: 'check' }, replyHint, h('span', { text: t(lang, 'popup.replyHint') })),
      ),
      h(
        'fieldset',
        {},
        h('legend', { text: t(lang, 'popup.language') }),
        h('div', { class: 'segmented' }, langOption('th', 'ไทย'), langOption('en', 'English')),
      ),
    ),
    h(
      'footer',
      { class: 'foot' },
      h('p', { class: 'muted', text: t(lang, 'popup.privacy') }),
      resetBtn,
    ),
  );
}

async function init() {
  [settings, stats] = await Promise.all([getSettings(), getStats()]);
  render();
  onStorageChange((change) => {
    if (change.settings) settings = change.settings;
    if (change.stats) stats = change.stats;
    render();
  });
}

void init();
