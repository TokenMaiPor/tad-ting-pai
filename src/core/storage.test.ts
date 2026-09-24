import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  dayKey,
  defaultSettings,
  getSettings,
  getSiteStatuses,
  getStats,
  lastDays,
  normalizeSettings,
  normalizeSiteStatuses,
  normalizeStats,
  onStorageChange,
  recordApply,
  resetStats,
  saveSettings,
  saveSiteStatus,
} from './storage';

beforeEach(() => fakeBrowser.reset());

describe('settings', () => {
  it('defaults: all sites on, reply hint on, UI language from the browser', () => {
    expect(defaultSettings('th-TH')).toEqual({
      uiLang: 'th',
      sites: { chatgpt: true, claude: true, gemini: true },
      appendReplyHint: true,
      disabledRules: [],
    });
    expect(defaultSettings('en-US').uiLang).toBe('en');
    expect(defaultSettings(undefined).uiLang).toBe('en');
  });

  it('repairs missing or invalid stored values', () => {
    expect(
      normalizeSettings({ uiLang: 'fr', sites: { claude: false }, appendReplyHint: 'yes' }, 'th'),
    ).toEqual({
      uiLang: 'th',
      sites: { chatgpt: true, claude: false, gemini: true },
      appendReplyHint: true,
      disabledRules: [],
    });
    expect(normalizeSettings(null, 'en').uiLang).toBe('en');
  });

  it('migrates v0.1 settings (no disabledRules) to "every rule on"', () => {
    const v01 = { uiLang: 'th', sites: { chatgpt: true, claude: true, gemini: false } };
    expect(normalizeSettings(v01, 'en').disabledRules).toEqual([]);
  });

  it('keeps only unique string rule ids', () => {
    expect(
      normalizeSettings({ disabledRules: ['th.thanks', 3, 'th.thanks', null, 'vi.da'] }, 'en')
        .disabledRules,
    ).toEqual(['th.thanks', 'vi.da']);
  });

  it('saves disabled rules', async () => {
    await saveSettings({ disabledRules: ['th.greetings'] });
    expect((await getSettings()).disabledRules).toEqual(['th.greetings']);
    await saveSettings({ disabledRules: [] });
    expect((await getSettings()).disabledRules).toEqual([]);
  });

  it('saves partial updates and merges per-site flags', async () => {
    await saveSettings({ uiLang: 'th' });
    await saveSettings({ sites: { chatgpt: true, claude: true, gemini: false } });
    const settings = await getSettings();
    expect(settings.uiLang).toBe('th');
    expect(settings.sites.gemini).toBe(false);
    expect(settings.sites.chatgpt).toBe(true);
  });
});

describe('stats', () => {
  it('starts at zero', async () => {
    expect(await getStats()).toEqual({ tokensSaved: 0, applyCount: 0, daily: {} });
  });

  it('adds only positive savings but counts every apply', async () => {
    await recordApply(31, 13);
    await recordApply(10, 14); // translation made it longer: no negative savings
    expect(await getStats()).toMatchObject({ tokensSaved: 18, applyCount: 2 });
  });

  it('resets', async () => {
    await recordApply(5, 1);
    await resetStats();
    expect(await getStats()).toEqual({ tokensSaved: 0, applyCount: 0, daily: {} });
  });

  it('ignores corrupted numbers', () => {
    expect(normalizeStats({ tokensSaved: -5, applyCount: Number.NaN })).toEqual({
      tokensSaved: 0,
      applyCount: 0,
      daily: {},
    });
    expect(normalizeStats({ tokensSaved: 12.7, applyCount: 2 })).toEqual({
      tokensSaved: 12,
      applyCount: 2,
      daily: {},
    });
    expect(normalizeStats('nope')).toEqual({ tokensSaved: 0, applyCount: 0, daily: {} });
    expect(
      normalizeStats({ daily: { '2026-09-01': 5.5, yesterday: 3, '2026-09-02': -1 } }).daily,
    ).toEqual({ '2026-09-01': 5 });
  });

  it('keeps per-day totals and drops days older than 30', async () => {
    const day = (d: number) => new Date(2026, 8, d, 12);
    await recordApply(20, 10, day(1));
    await recordApply(8, 3, day(24));
    await recordApply(9, 4, day(24));
    await recordApply(3, 9, day(24)); // no savings: no entry change
    expect((await getStats()).daily).toEqual({ '2026-09-01': 10, '2026-09-24': 10 });

    await recordApply(2, 1, new Date(2026, 9, 5, 12)); // 34 days after Sep 1
    const stats = await getStats();
    expect(stats.daily).toEqual({ '2026-09-24': 10, '2026-10-05': 1 });
    expect(stats.tokensSaved).toBe(21);
  });

  it('lists the last N local days, oldest first, across month ends', () => {
    expect(lastDays(new Date(2026, 9, 2, 8), 3)).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('onStorageChange', () => {
  it('notifies with normalised settings and stats, and can unsubscribe', async () => {
    const listener = vi.fn();
    const stop = onStorageChange(listener);
    await saveSettings({ uiLang: 'th' });
    await recordApply(3, 1);
    expect(listener).toHaveBeenCalledWith({ settings: expect.objectContaining({ uiLang: 'th' }) });
    expect(listener).toHaveBeenCalledWith({
      stats: expect.objectContaining({ tokensSaved: 2, applyCount: 1 }),
    });
    stop();
    listener.mockClear();
    await recordApply(3, 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores other storage areas and unrelated keys', async () => {
    const listener = vi.fn();
    onStorageChange(listener);
    await fakeBrowser.storage.sync.set({ settings: { uiLang: 'th' } });
    await fakeBrowser.storage.local.set({ other: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('site status', () => {
  it('drops unknown sites and states, trims long selectors', () => {
    expect(
      normalizeSiteStatuses({
        chatgpt: {
          state: 'fallback',
          inputSelector: 'x'.repeat(300),
          anchorSelector: null,
          checkedAt: 5,
        },
        claude: { state: 'weird' },
        other: { state: 'ok' },
      }),
    ).toEqual({
      chatgpt: {
        state: 'fallback',
        inputSelector: 'x'.repeat(200),
        anchorSelector: null,
        checkedAt: 5,
      },
    });
    expect(normalizeSiteStatuses('nope')).toEqual({});
  });

  it('saves per site without touching the others', async () => {
    const ok = { state: 'ok' as const, inputSelector: '#a', anchorSelector: 'form', checkedAt: 1 };
    await saveSiteStatus('chatgpt', ok);
    await saveSiteStatus('gemini', { ...ok, state: 'not-found', anchorSelector: null });
    const all = await getSiteStatuses();
    expect(all.chatgpt).toEqual(ok);
    expect(all.gemini?.state).toBe('not-found');
  });
});
