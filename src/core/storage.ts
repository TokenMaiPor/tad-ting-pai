// Settings and savings stats, kept in chrome.storage.local only (never synced, never sent anywhere).
import { browser } from 'wxt/browser';
import { defaultUiLang, type UiLang } from '../i18n';

export type SiteId = 'chatgpt' | 'claude' | 'gemini';

export interface Settings {
  uiLang: UiLang;
  sites: Record<SiteId, boolean>;
  /** Append the language pack's reply hint (e.g. "Reply in Thai.") after translating. */
  appendReplyHint: boolean;
}

export interface Stats {
  tokensSaved: number;
  applyCount: number;
}

const SETTINGS_KEY = 'settings';
const STATS_KEY = 'stats';

export function defaultSettings(browserLanguage?: string): Settings {
  return {
    uiLang: defaultUiLang(browserLanguage),
    sites: { chatgpt: true, claude: true, gemini: true },
    appendReplyHint: true,
  };
}

export const emptyStats: Stats = { tokensSaved: 0, applyCount: 0 };

function currentLanguage(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.language;
}

/** Merge stored data over defaults so older/partial records never break the UI. */
export function normalizeSettings(raw: unknown, browserLanguage?: string): Settings {
  const base = defaultSettings(browserLanguage);
  if (!raw || typeof raw !== 'object') return base;
  const value = raw as Partial<Settings>;
  return {
    uiLang: value.uiLang === 'th' || value.uiLang === 'en' ? value.uiLang : base.uiLang,
    sites: {
      chatgpt: value.sites?.chatgpt ?? base.sites.chatgpt,
      claude: value.sites?.claude ?? base.sites.claude,
      gemini: value.sites?.gemini ?? base.sites.gemini,
    },
    appendReplyHint:
      typeof value.appendReplyHint === 'boolean' ? value.appendReplyHint : base.appendReplyHint,
  };
}

export function normalizeStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return { ...emptyStats };
  const value = raw as Partial<Stats>;
  const safe = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return { tokensSaved: safe(value.tokensSaved), applyCount: safe(value.applyCount) };
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY], currentLanguage());
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = normalizeSettings(
    { ...current, ...patch, sites: { ...current.sites, ...patch.sites } },
    currentLanguage(),
  );
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getStats(): Promise<Stats> {
  const stored = await browser.storage.local.get(STATS_KEY);
  return normalizeStats(stored[STATS_KEY]);
}

/** Called only when the user confirms a replacement. Negative savings are never recorded. */
export async function recordApply(tokensBefore: number, tokensAfter: number): Promise<Stats> {
  const current = await getStats();
  const next: Stats = {
    tokensSaved: current.tokensSaved + Math.max(0, tokensBefore - tokensAfter),
    applyCount: current.applyCount + 1,
  };
  await browser.storage.local.set({ [STATS_KEY]: next });
  return next;
}

export async function resetStats(): Promise<Stats> {
  await browser.storage.local.set({ [STATS_KEY]: { ...emptyStats } });
  return { ...emptyStats };
}

type Listener = (change: { settings?: Settings; stats?: Stats }) => void;

export function onStorageChange(listener: Listener): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area !== 'local') return;
    const out: { settings?: Settings; stats?: Stats } = {};
    if (SETTINGS_KEY in changes)
      out.settings = normalizeSettings(changes[SETTINGS_KEY]?.newValue, currentLanguage());
    if (STATS_KEY in changes) out.stats = normalizeStats(changes[STATS_KEY]?.newValue);
    if (out.settings || out.stats) listener(out);
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
