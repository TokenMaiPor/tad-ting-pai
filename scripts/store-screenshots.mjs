// Chrome Web Store screenshots (1280×800), captured from the built extension running on the
// local test fixtures. Fully offline: every non-fixture request is blocked.
//
//   npm run build && node scripts/store-screenshots.mjs
//
// Output: docs/store/screenshots/*.png
/* global chrome */ // used inside worker.evaluate(), which runs in the extension
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EXTENSION_PATH = path.resolve('.output/chrome-mv3');
const OUT = path.resolve('docs/store/screenshots');
const SIZE = { width: 1280, height: 800 };
const SITES = {
  'chatgpt.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
};

if (!existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
  console.error('Build the extension first: npm run build');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// Paper background and a neutral composer, so the shots show our UI and not a bare test page.
// No site branding: the fixtures only mimic each site's DOM structure.
const STAGE_CSS = `
  body { background: #eef2ee !important; margin: 0 !important; max-width: none !important;
         font-family: 'Leelawadee UI', 'Noto Sans Thai', system-ui, sans-serif !important; }
  main { max-width: 760px; margin: 0 auto; padding-top: 280px; }
  [data-fixture="input"] { background: #fff; border-radius: 6px; font-size: 16px;
                           min-height: 72px !important; }
  [data-fixture="send"] { display: none; }
  .ttp-caption { position: fixed; top: 72px; left: 0; right: 0; text-align: center;
                 color: #1c2621; font-size: 34px; font-weight: 600; line-height: 1.3; }
  .ttp-caption small { display: block; font-size: 18px; font-weight: 400; color: #56635b; }
`;

async function stage(page, caption, sub) {
  await page.addStyleTag({ content: STAGE_CSS });
  await page.evaluate(
    ([c, s]) => {
      const el = document.createElement('div');
      el.className = 'ttp-caption';
      el.textContent = c;
      const small = document.createElement('small');
      small.textContent = s;
      el.append(small);
      document.body.prepend(el);
    },
    [caption, sub],
  );
}

async function typeDraft(page, text) {
  await page.locator('[data-fixture="input"]').click();
  await page.keyboard.insertText(text);
  await page.locator('[data-ttp="count"]').filter({ hasText: /\d/ }).waitFor({ timeout: 30_000 });
}

/** Put a small screenshot (the popup) on a 1280×800 paper stage with a caption. */
async function composite(context, png, file, caption, sub) {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  await page.setContent(`<!doctype html><html><body style="margin:0;height:800px;display:flex;
    align-items:center;justify-content:center;gap:72px;background:#eef2ee;
    font-family:'Leelawadee UI','Noto Sans Thai',system-ui,sans-serif;color:#1c2621">
    <div style="max-width:420px"><div style="font-size:34px;font-weight:600;line-height:1.3">${caption}</div>
    <div style="font-size:18px;color:#56635b;margin-top:12px">${sub}</div></div>
    <img src="data:image/png;base64,${png.toString('base64')}"
      style="border:1px solid #c9d3cc;border-radius:6px;height:760px"></body></html>`);
  await page.screenshot({ path: path.join(OUT, file) });
  await page.close();
}

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  locale: 'en-US',
  viewport: SIZE,
  deviceScaleFactor: 1,
});
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (url.protocol === 'chrome-extension:') return route.continue();
  const id = SITES[url.hostname];
  if (id && route.request().resourceType() === 'document') {
    const body = readFileSync(path.resolve(`tests/fixtures/${id}.html`), 'utf8');
    return route.fulfill({ status: 200, contentType: 'text/html', body });
  }
  return route.abort();
});

const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionId = new URL(worker.url()).host;

const THAI =
  'สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ เน้นประเด็นหลัก 3 ข้อ ดูที่ https://example.com/a ขอบคุณมากครับ';

// 1. Toolbar with the live token estimate.
let page = await context.newPage();
await page.goto('https://chatgpt.com/');
await stage(page, 'See what your message costs', 'A live token estimate under the chat box');
await typeDraft(page, THAI);
await page.screenshot({ path: path.join(OUT, '1-toolbar.png') });

// 2. Compress preview: before/after, rule chips, savings stamp.
await page.evaluate(() => {
  const caption = document.querySelector('.ttp-caption');
  caption.firstChild.textContent = 'Preview first, then decide';
  caption.querySelector('small').textContent = 'Nothing changes or gets sent without your click';
});
await page.locator('[data-ttp="compress"]').click();
await page.locator('[data-ttp="delta"]').filter({ hasText: /−\d/ }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(400); // let the panel's 150 ms fade-in finish
await page.screenshot({ path: path.join(OUT, '2-compress-preview.png') });
await page.locator('[data-ttp="apply"]').click();
await page.close();

// 3. Vietnamese on another site.
page = await context.newPage();
await page.goto('https://claude.ai/new');
await stage(page, 'Thai, Vietnamese and Indonesian', 'Rules are plain data. Add your language');
await typeDraft(
  page,
  'Xin chào, làm ơn giải thích sự khác nhau giữa TCP và UDP bằng ví dụ đơn giản nhé. Cảm ơn bạn!',
);
await page.locator('[data-ttp="compress"]').click();
await page.locator('[data-ttp="delta"]').filter({ hasText: /\d/ }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, '3-vietnamese.png') });
await page.close();

// 4–5. Popup: savings + 7-day strip, then the rule toggles (seeded numbers).
await worker.evaluate(async () => {
  const key = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  await chrome.storage.local.set({
    stats: {
      tokensSaved: 1284,
      applyCount: 57,
      daily: {
        [key(0)]: 212,
        [key(1)]: 96,
        [key(2)]: 180,
        [key(4)]: 305,
        [key(5)]: 64,
        [key(6)]: 140,
      },
    },
  });
});
// Rendered at 2× (CSS zoom) and shown at half size, so the popup stays sharp and readable.
const popup = await context.newPage();
await popup.setViewportSize({ width: 640, height: 1520 });
await popup.goto(`chrome-extension://${extensionId}/popup.html`);
await popup.addStyleTag({ content: 'html { zoom: 2; }' });
await popup.locator('[data-ttp="week"]').waitFor();
await composite(
  context,
  await popup.screenshot(),
  '4-popup.png',
  'Know how much you saved',
  'Counted only when you choose “Use this text”. Stored on your device only.',
);
await popup.locator('[data-ttp="rules"] summary').click();
await popup.locator('input[data-rule="th.thanks"]').uncheck();
await popup.locator('[data-ttp="rules"]').evaluate((el) => el.scrollIntoView());
await composite(
  context,
  await popup.screenshot(),
  '5-rules.png',
  'You decide what gets cut',
  'Switch any rule off. Code, links, numbers and quotes are never touched.',
);

await context.close();
console.log(`Saved 5 screenshots to ${path.relative(process.cwd(), OUT)}`);
