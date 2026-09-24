import { formatNumber, t, type UiLang } from '../../i18n';
import { browser } from 'wxt/browser';
import {
  getSettings,
  getSiteStatuses,
  getStats,
  lastDays,
  onStorageChange,
  resetStats,
  saveSettings,
  type Settings,
  type SiteId,
  type SiteStatus,
  type SiteStatuses,
  type Stats,
} from '../../core/storage';
import { h } from '../../ui/dom';
import { languagePacks } from '../../languages/registry';
import type { CompressionRule, LanguagePack } from '../../languages/types';

const SITES: { id: SiteId; label: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
];

const app = document.querySelector<HTMLElement>('#app');
let settings: Settings;
let stats: Stats;
let siteStatus: SiteStatuses = {};
let resetArmed = false;
// render() rebuilds the popup on every storage change; remember whether the rule list is open.
let rulesOpen = false;

const ISSUES_URL = 'https://github.com/TokenMaiPor/tad-ting-pai/issues/new';

const STATUS_KEY = {
  ok: 'popup.status.ok',
  fallback: 'popup.status.fallback',
  'not-found': 'popup.status.notFound',
} as const;

/**
 * Prefilled "site changed" issue. Carries only the selectors that matched plus versions:
 * nothing the user typed, no URL of their chat.
 */
function reportUrl(site: { id: SiteId; label: string }, status: SiteStatus): string {
  const diagnostics = [
    `site: ${site.id}`,
    `state: ${status.state}`,
    `input selector: ${status.inputSelector ?? '(none matched)'}`,
    `anchor selector: ${status.anchorSelector ?? '(none matched)'}`,
    `checked: ${new Date(status.checkedAt).toISOString()}`,
    `extension: ${browser.runtime.getManifest().version}`,
    `browser: ${/Chrome\/[\d.]+/.exec(navigator.userAgent)?.[0] ?? 'unknown'}`,
  ].join('\n');
  const params = new URLSearchParams({
    template: 'site_broken.yml',
    title: `[${site.label}] toolbar ${status.state === 'fallback' ? 'fell back to floating button' : 'not found'}`,
    site: site.label,
    status: status.state,
    diagnostics,
  });
  return `${ISSUES_URL}?${params.toString()}`;
}

/** Seven vertical bars, today last (DESIGN.md §10). Numbers are in a table for screen readers. */
function renderWeek(lang: UiLang): HTMLElement {
  const now = new Date();
  const days = lastDays(now, 7);
  const values = days.map((d) => stats.daily[d] ?? 0);
  const max = Math.max(...values);
  const locale = lang === 'th' ? 'th-TH' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const longDay = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const dateOf = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y!, m! - 1, d!);
  };

  const bars = days.map((day, i) => {
    const value = values[i]!;
    const height = max > 0 && value > 0 ? Math.max(2, Math.round((value / max) * 32)) : 0;
    return h(
      'div',
      { class: 'day', 'aria-hidden': 'true', 'data-today': i === days.length - 1 },
      h('span', {
        class: value > 0 ? 'bar' : 'bar bar-zero',
        style: `height: ${height}px`,
        'data-value': value,
      }),
      h('span', { class: 'day-label', text: weekday.format(dateOf(day)) }),
    );
  });

  const table = h(
    'table',
    { class: 'visually-hidden' },
    h('caption', { text: t(lang, 'popup.week') }),
    h(
      'tbody',
      {},
      ...days.map((day, i) =>
        h(
          'tr',
          {},
          h('th', { scope: 'row', text: longDay.format(dateOf(day)) }),
          h('td', { text: t(lang, 'panel.tokens', { n: values[i]! }) }),
        ),
      ),
    ),
  );

  return h(
    'figure',
    { class: 'week', 'data-ttp': 'week' },
    h('div', { class: 'bars' }, ...bars),
    h('figcaption', { class: 'muted', text: t(lang, 'popup.week') }),
    table,
  );
}

function ruleLabel(rule: CompressionRule, pack: LanguagePack, lang: UiLang): string {
  return lang === pack.code ? rule.label.native : rule.label.en;
}

function renderRules(lang: UiLang): HTMLElement {
  const disabled = new Set(settings.disabledRules);
  const all = languagePacks.flatMap((p) => p.rules);
  const on = all.filter((r) => !disabled.has(r.id)).length;

  // The interface language's own rules first (Thai users see Thai rules at the top).
  const packs = [...languagePacks].sort(
    (a, b) => Number(b.code === lang) - Number(a.code === lang),
  );
  const groups = packs.map((pack) =>
    h(
      'fieldset',
      { class: 'rule-group' },
      h('legend', { text: `${pack.name.en} · ${pack.name.native}` }),
      ...pack.rules.map((rule) => {
        const input = h('input', {
          type: 'checkbox',
          checked: !disabled.has(rule.id),
          'data-rule': rule.id,
        });
        input.addEventListener('change', () => {
          const next = new Set(settings.disabledRules);
          if (input.checked) next.delete(rule.id);
          else next.add(rule.id);
          void saveSettings({ disabledRules: [...next] });
        });
        const example = rule.examples[0];
        return h(
          'label',
          { class: 'check rule' },
          input,
          h(
            'span',
            {},
            h('span', { text: ruleLabel(rule, pack, lang) }),
            example
              ? h('span', {
                  class: 'rule-example',
                  lang: pack.code,
                  text: `${example.input} → ${example.output || t(lang, 'popup.removed')}`,
                })
              : null,
          ),
        );
      }),
    ),
  );

  const details = h(
    'details',
    { class: 'rules', open: rulesOpen, 'data-ttp': 'rules' },
    h('summary', { text: t(lang, 'popup.rules', { on, total: all.length }) }),
    ...groups,
  );
  details.addEventListener('toggle', () => (rulesOpen = details.open));
  return details;
}

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

  const statusLines = SITES.flatMap((site) => {
    const status = siteStatus[site.id];
    if (!status || !settings.sites[site.id]) return [];
    const broken = status.state !== 'ok';
    return [
      h(
        'li',
        { 'data-tone': broken ? 'warn' : undefined, 'data-ttp': `status-${site.id}` },
        h('span', { text: `${site.label} · ${t(lang, STATUS_KEY[status.state])}` }),
        broken
          ? h('a', {
              href: reportUrl(site, status),
              target: '_blank',
              rel: 'noopener noreferrer',
              'data-ttp': `report-${site.id}`,
              text: t(lang, 'popup.report'),
            })
          : null,
      ),
    ];
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
      renderWeek(lang),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', { text: t(lang, 'popup.settings') }),
      h(
        'fieldset',
        {},
        h('legend', { text: t(lang, 'popup.sites') }),
        ...siteBoxes,
        statusLines.length > 0
          ? h(
              'ul',
              { class: 'site-status', 'aria-label': t(lang, 'popup.siteStatus') },
              ...statusLines,
            )
          : null,
      ),
      renderRules(lang),
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
  [settings, stats, siteStatus] = await Promise.all([getSettings(), getStats(), getSiteStatuses()]);
  render();
  onStorageChange((change) => {
    if (change.settings) settings = change.settings;
    if (change.stats) stats = change.stats;
    if (change.siteStatus) siteStatus = change.siteStatus;
    render();
  });
}

void init();
