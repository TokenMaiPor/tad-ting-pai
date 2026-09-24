// Settings and savings stats, kept in chrome.storage.local only (never synced, never sent anywhere).
import { browser } from 'wxt/browser';
import { defaultUiLang, type UiLang } from '../i18n';

export type SiteId = 'chatgpt' | 'claude' | 'gemini';

export interface Settings {
  uiLang: UiLang;
  sites: Record<SiteId, boolean>;
  /** Append the language pack's reply hint (e.g. "Reply in Thai.") after translating. */
  appendReplyHint: boolean;
  /** Compression rule ids the user switched off in the popup (e.g. "th.thanks"). */
  disabledRules: string[];
}

export interface Stats {
  tokensSaved: number;
  applyCount: number;
  /** Tokens saved per local calendar day ("2026-09-24" → 120). Only the last 30 days are kept. */
  daily: Record<string, number>;
}

/** How many days of daily totals to keep. The popup shows the last 7. */
export const DAILY_KEEP_DAYS = 30;

/** How the toolbar last managed to mount on a site. Shown in the popup, used in bug reports. */
export interface SiteStatus {
  state: 'ok' | 'fallback' | 'not-found';
  inputSelector: string | null;
  anchorSelector: string | null;
  /** Epoch ms. */
  checkedAt: number;
}

export type SiteStatuses = Partial<Record<SiteId, SiteStatus>>;

const SETTINGS_KEY = 'settings';
const STATS_KEY = 'stats';
const SITE_STATUS_KEY = 'siteStatus';

export function defaultSettings(browserLanguage?: string): Settings {
  return {
    uiLang: defaultUiLang(browserLanguage),
    sites: { chatgpt: true, claude: true, gemini: true },
    appendReplyHint: true,
    disabledRules: [],
  };
}

export const emptyStats: Stats = { tokensSaved: 0, applyCount: 0, daily: {} };

/** Local-date key, e.g. "2026-09-24". */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The `count` days ending today, oldest first. */
export function lastDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - i));
    return dayKey(d);
  });
}

function pruneDaily(daily: Record<string, number>, now: Date): Record<string, number> {
  const oldest = lastDays(now, DAILY_KEEP_DAYS)[0]!;
  // Keys are zero-padded ISO dates, so string order is date order.
  return Object.fromEntries(Object.entries(daily).filter(([day]) => day >= oldest));
}

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
    // v0.1 had no such field: missing means every rule is on.
    disabledRules: Array.isArray(value.disabledRules)
      ? [
          ...new Set(value.disabledRules.filter((id): id is string => typeof id === 'string')),
        ].slice(0, 500)
      : base.disabledRules,
  };
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return { ...emptyStats, daily: {} };
  const value = raw as Partial<Stats>;
  const safe = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  const daily: Record<string, number> = {};
  if (value.daily && typeof value.daily === 'object') {
    for (const [day, n] of Object.entries(value.daily)) {
      if (DAY_KEY.test(day) && safe(n) > 0) daily[day] = safe(n);
    }
  }
  return { tokensSaved: safe(value.tokensSaved), applyCount: safe(value.applyCount), daily };
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
export async function recordApply(
  tokensBefore: number,
  tokensAfter: number,
  now: Date = new Date(),
): Promise<Stats> {
  const current = await getStats();
  const saved = Math.max(0, tokensBefore - tokensAfter);
  const today = dayKey(now);
  const daily = pruneDaily(current.daily, now);
  if (saved > 0) daily[today] = (daily[today] ?? 0) + saved;
  const next: Stats = {
    tokensSaved: current.tokensSaved + saved,
    applyCount: current.applyCount + 1,
    daily,
  };
  await browser.storage.local.set({ [STATS_KEY]: next });
  return next;
}

export async function resetStats(): Promise<Stats> {
  await browser.storage.local.set({ [STATS_KEY]: { ...emptyStats, daily: {} } });
  return { ...emptyStats, daily: {} };
}

const SITE_IDS: SiteId[] = ['chatgpt', 'claude', 'gemini'];
const SITE_STATES: SiteStatus['state'][] = ['ok', 'fallback', 'not-found'];

export function normalizeSiteStatuses(raw: unknown): SiteStatuses {
  if (!raw || typeof raw !== 'object') return {};
  const out: SiteStatuses = {};
  for (const id of SITE_IDS) {
    const value = (raw as Record<string, Partial<SiteStatus> | undefined>)[id];
    if (!value || !SITE_STATES.includes(value.state as SiteStatus['state'])) continue;
    const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : null);
    out[id] = {
      state: value.state as SiteStatus['state'],
      inputSelector: text(value.inputSelector),
      anchorSelector: text(value.anchorSelector),
      checkedAt: typeof value.checkedAt === 'number' ? value.checkedAt : 0,
    };
  }
  return out;
}

export async function getSiteStatuses(): Promise<SiteStatuses> {
  const stored = await browser.storage.local.get(SITE_STATUS_KEY);
  return normalizeSiteStatuses(stored[SITE_STATUS_KEY]);
}

export async function saveSiteStatus(id: SiteId, status: SiteStatus): Promise<void> {
  const current = await getSiteStatuses();
  await browser.storage.local.set({ [SITE_STATUS_KEY]: { ...current, [id]: status } });
}

type Listener = (change: { settings?: Settings; stats?: Stats; siteStatus?: SiteStatuses }) => void;

export function onStorageChange(listener: Listener): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area !== 'local') return;
    const out: Parameters<Listener>[0] = {};
    if (SETTINGS_KEY in changes)
      out.settings = normalizeSettings(changes[SETTINGS_KEY]?.newValue, currentLanguage());
    if (STATS_KEY in changes) out.stats = normalizeStats(changes[STATS_KEY]?.newValue);
    if (SITE_STATUS_KEY in changes)
      out.siteStatus = normalizeSiteStatuses(changes[SITE_STATUS_KEY]?.newValue);
    if (out.settings || out.stats || out.siteStatus) listener(out);
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
