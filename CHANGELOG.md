# Changelog

All notable changes to TadTingPai. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

## [0.2.0] - 2026-09-24

### Added

- **Vietnamese and Indonesian** compression rules (greetings, request openers, casual/polite particles, thanks). The right pack is picked from what you type; English is never compressed.
- **Per-rule switches** in the popup, with an example for each rule. The preview shows which rules fired as chips.
- **Keyboard shortcut** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> opens the Compress preview (rebind at `chrome://extensions/shortcuts`).
- **7-day savings strip** in the popup. Per-day totals are kept on your device for 30 days.
- **Fallback button**: when a site changes its layout and the strip can't find its spot, a small floating button appears next to the chat box instead of nothing.
- **Site status** in the popup and a **Report a broken site** link that opens a prefilled GitHub issue with the page selectors only, never your text.
- Chrome Web Store listing text, privacy policy and screenshots in `docs/store/`.

### Changed

- The toolbar no longer guesses a position next to the chat box when the site's composer container is missing; it uses the fallback button.

## [0.1.0] - 2026-09-23

First public release.

### Added

- Toolbar under the chat box on ChatGPT, Claude and Gemini with a live token estimate (o200k_base).
- **Compress**: 9 Thai rules (polite particles, casual particles, greetings, request openers/endings, fillers, thanks, "ทำการ", wordy phrases), defined as data in `src/languages/th/`.
- Protection for code blocks, inline code, URLs, e-mails, numbers and quoted text.
- **Translate to English** with Chrome's on-device Translator API, plus "Reply in Thai.".
- Before/after preview with token counts. Nothing is applied or sent without your click.
- Popup: tokens saved, per-site toggles, Thai/English interface.
- No network calls (enforced by lint and a bundle audit in CI), only the `storage` permission.

[0.2.0]: https://github.com/TokenMaiPor/tad-ting-pai/releases/tag/v0.2.0
[0.1.0]: https://github.com/TokenMaiPor/tad-ting-pai/releases/tag/v0.1.0
