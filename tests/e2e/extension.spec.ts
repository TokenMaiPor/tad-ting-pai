import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const EXTENSION_PATH = path.resolve('.output/chrome-mv3');
const SITES = [
  { id: 'chatgpt', url: 'https://chatgpt.com/' },
  { id: 'claude', url: 'https://claude.ai/new' },
  { id: 'gemini', url: 'https://gemini.google.com/app' },
] as const;

const fixture = (id: string) => readFileSync(path.resolve(`tests/fixtures/${id}.html`), 'utf8');

/**
 * Simulate a site redesign: rename every composer container the adapters look for, so the
 * chat box is still there but the toolbar's usual anchor is gone.
 */
const breakAnchors = (html: string) =>
  html.replace(
    /<(\/?)(form|fieldset|input-area-v2|rich-textarea|input-container)\b/g,
    '<$1section',
  );

const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
      locale: 'en-US',
    });
    // Serve fixtures for the real hostnames and block everything else: fully offline.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      // The extension's own files (popup, scripts) are local, never network.
      if (url.protocol === 'chrome-extension:') return route.continue();
      const site = SITES.find((s) => new URL(s.url).hostname === url.hostname);
      if (site && route.request().resourceType() === 'document') {
        const html = fixture(site.id);
        const body = url.searchParams.has('ttp-broken') ? breakAnchors(html) : html;
        return route.fulfill({ status: 200, contentType: 'text/html', body });
      }
      return route.abort();
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(new URL(worker.url()).host);
  },
});

async function translatorState(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const api = (globalThis as { Translator?: { availability(o: object): Promise<string> } })
      .Translator;
    if (!api) return 'none';
    try {
      return await api.availability({ sourceLanguage: 'th', targetLanguage: 'en' });
    } catch {
      return 'error';
    }
  });
}

const DRAFT =
  'สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ ดูที่ https://example.com/a ครับ';
const EXPECTED = 'สรุปบทความนี้ ดูที่ https://example.com/a';

for (const site of SITES) {
  test(`${site.id}: toolbar mounts, compress → preview → apply, never sends`, async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto(site.url);

    const toolbar = page.locator('tad-ting-pai');
    await expect(toolbar).toBeAttached();
    const input = page.locator('[data-fixture="input"]');

    // Toolbar sits directly after the composer container, i.e. under the chat input.
    const placedAfterComposer = await page.evaluate(() => {
      const host = document.querySelector('tad-ting-pai');
      const input = document.querySelector('[data-fixture="input"]');
      const prev = host?.previousElementSibling;
      return !!prev && !!input && prev.contains(input);
    });
    expect(placedAfterComposer).toBe(true);

    await input.click();
    await page.keyboard.insertText(DRAFT);
    // Non-zero: the count of the typed draft, not the empty box. The tokenizer loads on first use.
    await expect(page.locator('[data-ttp="count"]')).toHaveText(/^≈ [1-9][\d,]* tokens$/, {
      timeout: 20_000,
    });

    // Translate button is only visible when the browser can actually translate th→en.
    const state = await translatorState(page);
    const translate = page.locator('[data-ttp="translate"]');
    if (state === 'none' || state === 'unavailable' || state === 'error')
      await expect(translate).toBeHidden();
    else await expect(translate).toBeVisible();

    await page.locator('[data-ttp="compress"]').click();
    const panel = page.locator('[data-ttp="panel"]');
    await expect(panel).toBeVisible();
    await expect(page.locator('[data-ttp="before"]')).toHaveText(DRAFT);
    await expect(page.locator('[data-ttp="after"]')).toHaveText(EXPECTED);
    await expect(page.locator('[data-ttp="delta"]')).toHaveText(/^−\d+ tokens$/, {
      timeout: 20_000,
    });
    await page.screenshot({ path: `test-results/${site.id}-preview.png` });

    // Nothing has changed in the chat box yet; the user must confirm.
    await expect(input).toHaveText(DRAFT);

    await page.locator('[data-ttp="apply"]').click();
    await expect(panel).toBeHidden();
    await expect(input).toHaveText(EXPECTED);
    await page.screenshot({ path: `test-results/${site.id}-applied.png` });

    expect(
      await page.evaluate(() => (window as unknown as { __sentCount: number }).__sentCount),
    ).toBe(0);
    expect(
      await page.evaluate(() => (window as unknown as { __inputEvents: number }).__inputEvents),
    ).toBeGreaterThan(0);
  });
}

test('cancel keeps the original text, Esc closes the preview', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(SITES[0].url);
  const input = page.locator('[data-fixture="input"]');
  await input.click();
  await page.keyboard.insertText('ขอบคุณครับ ช่วยอธิบายเพิ่มได้ไหมคะ');

  await page.locator('[data-ttp="compress"]').click();
  await page.locator('[data-ttp="cancel"]').click();
  await expect(page.locator('[data-ttp="panel"]')).toBeHidden();
  await expect(input).toHaveText('ขอบคุณครับ ช่วยอธิบายเพิ่มได้ไหมคะ');

  await page.locator('[data-ttp="compress"]').click();
  await expect(page.locator('[data-ttp="panel"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-ttp="panel"]')).toBeHidden();
  await expect(input).toHaveText('ขอบคุณครับ ช่วยอธิบายเพิ่มได้ไหมคะ');
  expect(
    await page.evaluate(() => (window as unknown as { __sentCount: number }).__sentCount),
  ).toBe(0);
});

test('popup shows savings and switches the page UI to Thai', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(SITES[1].url);
  await page.locator('[data-fixture="input"]').click();
  await page.keyboard.insertText(DRAFT);
  await page.locator('[data-ttp="compress"]').click();
  // Savings are recorded with the counts, so wait until they are shown before applying.
  await expect(page.locator('[data-ttp="delta"]')).toHaveText(/^−\d+ tokens$/, { timeout: 20_000 });
  await page.locator('[data-ttp="apply"]').click();

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 560 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('[data-ttp="saved-total"]')).toHaveText(/^[1-9]\d*$/);
  await expect(popup.getByText('Used 1 times')).toBeVisible();
  await popup.screenshot({ path: 'test-results/popup-en.png' });

  await popup.getByText('ไทย', { exact: true }).click();
  await expect(popup.getByText('โทเคนที่ประหยัดได้', { exact: true })).toBeVisible();
  await popup.screenshot({ path: 'test-results/popup-th.png' });

  await page.bringToFront();
  await expect(page.locator('[data-ttp="compress"]')).toHaveText('บีบข้อความ');
  await expect(page.locator('[data-ttp="count"]')).toHaveText(/โทเคน$/);
});

test('turning a site off in the popup removes the toolbar', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(SITES[2].url);
  await expect(page.locator('tad-ting-pai')).toBeAttached();

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByLabel('Gemini').uncheck();

  await page.bringToFront();
  await expect(page.locator('tad-ting-pai')).toHaveCount(0);
});

for (const site of SITES) {
  test(`${site.id}: when the composer container is gone, a floating button still works`, async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`${site.url}?ttp-broken=1`);
    const input = page.locator('[data-fixture="input"]');
    await input.click();
    await page.keyboard.insertText(DRAFT);

    // No bar under the chat box; after the grace period the floating fallback appears.
    await expect(page.locator('tad-ting-pai[data-variant="bar"]')).toHaveCount(0);
    const floating = page.locator('tad-ting-pai[data-variant="floating"]');
    await expect(floating).toBeVisible({ timeout: 10_000 });

    // Pinned to the chat box's top-right corner (above it, or just inside when there's no room)
    // and fully inside the viewport.
    await page.screenshot({ path: `test-results/${site.id}-fallback.png` });
    const [box, inputBox] = await Promise.all([floating.boundingBox(), input.boundingBox()]);
    const viewport = page.viewportSize();
    expect(box && inputBox && viewport).toBeTruthy();
    expect(Math.abs(box!.x + box!.width - (inputBox!.x + inputBox!.width))).toBeLessThanOrEqual(1);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(inputBox!.y + inputBox!.height);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    await page.screenshot({ path: `test-results/${site.id}-fallback.png` });

    await page.locator('[data-ttp="compress"]').click();
    await expect(page.locator('[data-ttp="after"]')).toHaveText(EXPECTED);
    await page.locator('[data-ttp="apply"]').click();
    await expect(input).toHaveText(EXPECTED);
    expect(
      await page.evaluate(() => (window as unknown as { __sentCount: number }).__sentCount),
    ).toBe(0);

    // The popup reports the fallback and offers a prefilled report without any chat text.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator(`[data-ttp="status-${site.id}"]`)).toContainText('fallback button');
    const href = await popup.locator(`[data-ttp="report-${site.id}"]`).getAttribute('href');
    expect(href).toContain('template=site_broken.yml');
    expect(decodeURIComponent(href ?? '')).not.toContain('บทความ');
  });
}

test('a rule switched off in the popup no longer fires; the preview shows rule chips', async ({
  context,
  extensionId,
}) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.locator('[data-ttp="rules"] summary').click();
  await expect(popup.locator('[data-ttp="rules"] summary')).toContainText('17/17');
  await popup.locator('input[data-rule="th.greetings"]').uncheck();
  await expect(popup.locator('[data-ttp="rules"] summary')).toContainText('16/17');
  // The list stays open after the re-render that saving triggers.
  await expect(popup.locator('input[data-rule="th.greetings"]')).toBeVisible();
  await popup.screenshot({ path: 'test-results/popup-rules.png', fullPage: true });

  const page = await context.newPage();
  await page.goto(SITES[0].url);
  await page.locator('[data-fixture="input"]').click();
  await page.keyboard.insertText(DRAFT);
  await page.locator('[data-ttp="compress"]').click();
  await expect(page.locator('[data-ttp="after"]')).toHaveText(/^สวัสดี สรุปบทความนี้/);
  const chips = page.locator('[data-ttp="rule-chip"]');
  await expect(chips.first()).toBeVisible();
  await expect(chips.filter({ hasText: 'greeting' })).toHaveCount(0);
  await expect(chips.filter({ hasText: 'polite particles' })).toContainText('×3');
});

test('the keyboard shortcut is declared and opens the preview on the chat tab', async ({
  context,
}) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const commands = await worker.evaluate(() => chrome.runtime.getManifest().commands);
  expect(commands?.['compress-message']?.suggested_key).toEqual({ default: 'Alt+Shift+K' });

  const page = await context.newPage();
  await page.goto(SITES[1].url);
  await page.locator('[data-fixture="input"]').click();
  await page.keyboard.insertText(DRAFT);
  await expect(page.locator('tad-ting-pai')).toBeAttached();

  // Chrome delivers real shortcuts through its own UI, which automation can't press, so
  // send what the background worker sends when the command fires.
  // Like the background worker, target the active tab (no "tabs" permission needed).
  await page.bringToFront();
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await chrome.tabs.sendMessage(tab!.id!, { type: 'ttp:compress' });
  });
  await expect(page.locator('[data-ttp="panel"]')).toBeVisible();
  await expect(page.locator('[data-ttp="after"]')).toHaveText(EXPECTED);
  await expect(page.locator('[data-fixture="input"]')).toHaveText(DRAFT);
});

test('popup shows the last 7 days of savings', async ({ context, extensionId }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async () => {
    const key = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    await chrome.storage.local.set({
      stats: {
        tokensSaved: 540,
        applyCount: 23,
        daily: { [key(0)]: 120, [key(1)]: 60, [key(3)]: 240, [key(6)]: 30, [key(40)]: 90 },
      },
    });
  });

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 640 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const bars = popup.locator('[data-ttp="week"] .bar');
  await expect(bars).toHaveCount(7);
  const values = await bars.evaluateAll((els) => els.map((el) => el.getAttribute('data-value')));
  expect(values).toEqual(['30', '0', '0', '240', '0', '60', '120']);
  // The busiest day is full height; the table carries the numbers for screen readers.
  expect(await bars.nth(3).evaluate((el) => el.getBoundingClientRect().height)).toBe(32);
  await expect(popup.locator('[data-ttp="week"] table tr')).toHaveCount(7);
  await popup.screenshot({ path: 'test-results/popup-week.png' });

  await popup.getByText('ไทย', { exact: true }).click();
  await expect(popup.locator('[data-ttp="week"] figcaption')).toHaveText(
    'โทเคนที่ประหยัดได้ 7 วันล่าสุด',
  );
  await popup.screenshot({ path: 'test-results/popup-week-th.png' });
});
