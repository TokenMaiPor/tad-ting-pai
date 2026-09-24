<p align="center"><img src="public/icon/128.png" width="96" alt="TadTingPai icon"></p>

<h1 align="center">TadTingPai</h1>

<p align="center"><em>TadTingPai (Thai for "just cut it out")</em><br>
Spend fewer tokens on ChatGPT, Claude and Gemini when you write in Thai, Vietnamese or Indonesian.</p>

<p align="center">

[![CI](https://github.com/TokenMaiPor/tad-ting-pai/actions/workflows/ci.yml/badge.svg)](https://github.com/TokenMaiPor/tad-ting-pai/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/TokenMaiPor/tad-ting-pai?include_prereleases)](https://github.com/TokenMaiPor/tad-ting-pai/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![No network calls](https://img.shields.io/badge/network%20calls-0-brightgreen)

</p>

<p align="center"><strong>English</strong> · <strong><a href="README.th.md">🇹🇭 อ่านคู่มือภาษาไทย</a></strong></p>

> **v0.2 is an early release.** It works on the three sites today, and we would love to hear how it behaves on your prompts.
> [Open an issue](https://github.com/TokenMaiPor/tad-ting-pai/issues/new/choose) with anything odd, even a single sentence.

AI chat services charge and rate-limit by **tokens**, and most tokenizers are built around English.
The same request written in Thai often costs **2–3× more tokens** than in English. We call that the _token tax_.

TadTingPai is a free, open-source Chrome extension that helps you pay less of it on
**ChatGPT**, **Claude** and **Gemini**:

- **Live token count** under the chat box (an estimate, see below).
- **Compress**: removes polite particles and filler that the AI doesn't need
  (`ครับ`, `ค่ะ`, `นะคะ`, `รบกวนช่วย…ให้หน่อยได้ไหม`, `แบบว่า`…).
- **Translate to English**: uses Chrome's **on-device** translator and adds "Reply in Thai." so the answer still comes back in Thai.
- **You stay in control**: every change is shown **before and after, with token counts**. Nothing changes until you press
  **Use this text**, and the extension **never sends a message**. You always press send yourself.
- **Protected text is never touched**: code blocks, `inline code`, URLs, e-mail addresses, numbers and "quoted text".
- **Thai, Vietnamese and Indonesian** rule packs, picked automatically from what you type. Switch any rule off in the popup.
- **Keyboard shortcut**: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> opens the Compress preview (change it at `chrome://extensions/shortcuts`).
- **Savings history**: the popup shows tokens saved over the last 7 days (stored on your device only).
- **Keeps working when a site changes**: if the strip can't find its usual spot, a small **TadTingPai · Compress** button
  appears next to the chat box instead, and the popup offers a one-click **Report a broken site** (it never includes what you typed).

![The TadTingPai strip under a chat box](docs/images/toolbar.png)

![Before/after preview: 31 → 6 tokens](docs/images/preview.png)

> Example: `สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ ขอบคุณล่วงหน้านะครับ` → `สรุปบทความนี้`
> ≈ 31 → 6 tokens (o200k_base). You see this preview and decide; nothing is sent for you.

## Privacy

- **No network calls.** No server, no analytics, no telemetry. ESLint blocks `fetch`/`XMLHttpRequest`/`WebSocket` in the source,
  and `npm run audit:network` checks the built bundle for them in CI.
- **One permission: `storage`.** Settings and your "tokens saved" total live in `chrome.storage.local` on your device and are never synced.
- The extension only runs on `chatgpt.com`, `chat.openai.com`, `claude.ai` and `gemini.google.com`.
- Translation uses Chrome's built-in Translator API. Chrome may download a language model once; after that, translation happens on your device.

## About the numbers (estimates)

Counts use OpenAI's `o200k_base` tokenizer (GPT-4o family) via [js-tiktoken](https://github.com/dqbd/tiktoken).
Claude and Gemini use their own tokenizers, so treat the numbers as a guide to _relative_ savings, not a bill.
"Tokens saved" in the popup only counts changes you actually applied, and a translation that comes out longer never subtracts.

## Install

### Quick install (no coding)

Requirements: Chrome 120+ on a computer (Translate needs Chrome 138+).

1. Download `tad-ting-pai-<version>-chrome.zip` from the [latest release](https://github.com/TokenMaiPor/tad-ting-pai/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder (the one containing `manifest.json`).
4. Click the puzzle-piece icon and pin **TadTingPai** to the toolbar.

### Build from source

Requirements: Node.js 22+.

1. In the project folder, run `npm install` (first time only), then run `npm run build`.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `.output/chrome-mv3` folder.
4. Click the puzzle-piece icon and pin **TadTingPai** to the toolbar.

### How to use

1. Open [chatgpt.com](https://chatgpt.com), [claude.ai](https://claude.ai) or [gemini.google.com](https://gemini.google.com) and log in as usual.
2. Under the chat box you'll see a thin strip: **≈ N tokens · estimate**, **Compress** and **Translate to English**.
   If you don't see it, reload the page (F5). Pages that were already open before you installed the extension need one reload.
3. Type your message as usual. The token count updates as you type.
4. Press **Compress** (or **Translate to English**). A preview shows the text **Before** and **After** with the token counts.
5. Press **Use this text** to replace the chat box text, or **Keep original** to leave it unchanged. Then press send yourself.
6. Click the TadTingPai icon on the toolbar to see tokens saved (total and last 7 days), choose which sites show the strip,
   switch compression rules on or off, and switch the interface between ไทย and English.
7. Prefer the keyboard? <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> opens the Compress preview on the current chat.

The **Translate to English** button only appears in Chrome 138+ on desktop, when Chrome's on-device translator supports Thai.
The first translation may take a while because Chrome downloads its language model once.

### Development

```bash
npm run dev          # opens Chrome with the extension and hot reload
npm test             # unit tests (Vitest)
npm run test:e2e     # builds, then drives the extension in Chromium on local copies of each site
npm run lint         # ESLint (includes the no-network rule)
npm run typecheck    # TypeScript strict
npm run audit:network  # privacy audit of the built bundle
npm run zip          # package for the Chrome Web Store
```

## How it works

```
src/
  adapters/      one file per site: where the chat box is, where the toolbar goes
  protect/       masks code, URLs, e-mails, numbers and quotes before any rule runs
  languages/     language packs as data (th, vi, id: src/languages/<code>/rules.ts)
  core/          compression engine, token counter, translator, storage
  ui/            toolbar + before/after preview (Shadow DOM, styled per DESIGN.md)
  entrypoints/   content script, background worker (tokenizer), popup
```

The compression engine is language-agnostic. A phrase is only removed when it:

1. starts and ends on a real word boundary (`Intl.Segmenter`), so `คะ` never matches inside `คะแนน`;
2. is in the right position (for example, at the end of a clause for polite particles);
3. is outside protected text.

If a protected placeholder is damaged for any reason, the extension gives up and keeps your original text.

Vietnamese and Indonesian put spaces between words, so their packs set `wordSpacing`: a clause ends at punctuation or a
line break, not at a space, and matching ignores case. Indonesian uses plain Latin letters like English, so it is only
picked when common Indonesian words appear (`markers`). English text is never compressed.

## Manual release checklist

The sites change their layout often, and automated tests use local copies. Before each release:

- [ ] Load the unpacked build and open each of ChatGPT, Claude and Gemini while logged in.
- [ ] The toolbar appears right under the chat box and the count updates as you type.
- [ ] Compress → preview → **Use this text** replaces the text and the site's send button reacts. Nothing is sent.
- [ ] Translate (Chrome 138+) shows a preview ending in "Reply in Thai."
- [ ] Start a new chat and switch chats: the toolbar re-attaches.
- [ ] The popup shows "toolbar OK" for each site you opened (not "fallback button").
- [ ] <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> opens the preview.

If a site broke, the fix is usually one selector in `src/adapters/<site>.ts`. Store screenshots:
`npm run build && node scripts/store-screenshots.mjs`, listing text in [docs/store/listing.md](docs/store/listing.md).

## Contributing

New languages, rules and site fixes are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
Every change is summarised in plain language in [docs/maintainer-log.md](docs/maintainer-log.md).

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
