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
        return route.fulfill({ status: 200, contentType: 'text/html', body: fixture(site.id) });
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
  await expect(popup.getByText('โทเคนที่ประหยัดได้')).toBeVisible();
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
