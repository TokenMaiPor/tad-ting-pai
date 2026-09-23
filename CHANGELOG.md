# Changelog

All notable changes to TadTingPai. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

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

[0.1.0]: https://github.com/TokenMaiPor/tad-ting-pai/releases/tag/v0.1.0
