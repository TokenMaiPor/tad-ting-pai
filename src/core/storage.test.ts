import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  defaultSettings,
  getSettings,
  getStats,
  normalizeSettings,
  normalizeStats,
  onStorageChange,
  recordApply,
  resetStats,
  saveSettings,
} from './storage';

beforeEach(() => fakeBrowser.reset());

describe('settings', () => {
  it('defaults: all sites on, reply hint on, UI language from the browser', () => {
    expect(defaultSettings('th-TH')).toEqual({
      uiLang: 'th',
      sites: { chatgpt: true, claude: true, gemini: true },
      appendReplyHint: true,
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
    });
    expect(normalizeSettings(null, 'en').uiLang).toBe('en');
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
    expect(await getStats()).toEqual({ tokensSaved: 0, applyCount: 0 });
  });

  it('adds only positive savings but counts every apply', async () => {
    await recordApply(31, 13);
    await recordApply(10, 14); // translation made it longer: no negative savings
    expect(await getStats()).toEqual({ tokensSaved: 18, applyCount: 2 });
  });

  it('resets', async () => {
    await recordApply(5, 1);
    await resetStats();
    expect(await getStats()).toEqual({ tokensSaved: 0, applyCount: 0 });
  });

  it('ignores corrupted numbers', () => {
    expect(normalizeStats({ tokensSaved: -5, applyCount: Number.NaN })).toEqual({
      tokensSaved: 0,
      applyCount: 0,
    });
    expect(normalizeStats({ tokensSaved: 12.7, applyCount: 2 })).toEqual({
      tokensSaved: 12,
      applyCount: 2,
    });
    expect(normalizeStats('nope')).toEqual({ tokensSaved: 0, applyCount: 0 });
  });
});

describe('onStorageChange', () => {
  it('notifies with normalised settings and stats, and can unsubscribe', async () => {
    const listener = vi.fn();
    const stop = onStorageChange(listener);
    await saveSettings({ uiLang: 'th' });
    await recordApply(3, 1);
    expect(listener).toHaveBeenCalledWith({ settings: expect.objectContaining({ uiLang: 'th' }) });
    expect(listener).toHaveBeenCalledWith({ stats: { tokensSaved: 2, applyCount: 1 } });
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
