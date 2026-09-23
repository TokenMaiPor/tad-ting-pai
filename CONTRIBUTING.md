# Contributing to TadTingPai

Thanks for helping people pay less token tax. This guide covers the three most common
contributions: **adding a language**, **adding or changing a rule**, and **fixing a site adapter**.

## Setup

```bash
npm ci
npm test          # unit tests
npm run lint      # must pass: ESLint also forbids network APIs
npm run typecheck
npm run test:e2e  # optional locally, runs in CI
```

Ground rules that every change must keep:

1. **No network calls.** No `fetch`, `XMLHttpRequest`, `WebSocket`, analytics or remote code.
   Lint and `npm run audit:network` enforce this.
2. **Never send a message.** The extension may only replace the chat box text after the user presses **Use this text**.
3. **Protected text is untouchable.** Code, URLs, e-mails, numbers and quoted text must come back byte-identical.
4. **When in doubt, leave it out.** A rule that saves 2 tokens but sometimes changes meaning does more harm than good.

## Add a new language

A language is a folder of data. The engine discovers it automatically; you don't edit any core file.

### 1. Create the pack

`src/languages/<code>/index.ts`, where `<code>` is the BCP 47 code used by `Intl.Segmenter`
and Chrome's Translator API (for example `vi`, `ja`, `hi`):

```ts
import type { LanguagePack } from '../types';
import { vietnameseRules } from './rules';

const vietnamese: LanguagePack = {
  code: 'vi',
  name: { en: 'Vietnamese', native: 'Tiếng Việt' },
  // Characters that identify the script. Used to detect which pack applies. No `g` flag.
  script: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
  replyHint: 'Reply in Vietnamese.',
  rules: vietnameseRules,
};

export default vietnamese;
```

For scripts without spaces between words (Thai, Lao, Khmer, Burmese), also set `syllableBreak`.
See `src/languages/th/index.ts` and the comment in `src/languages/types.ts`.

### 2. Write the rules as data

`src/languages/<code>/rules.ts` exports an array of `CompressionRule`:

```ts
{
  id: 'vi.polite-particles',            // "<code>.<kebab-name>", unique
  label: { en: 'Removed polite particles', native: 'Bỏ tiểu từ lịch sự' },
  description: 'Why this is safe to remove, in one sentence.',
  position: 'clause-end',               // anywhere | clause-start | clause-end | standalone
  replacements: { 'ạ': '' },            // phrase → replacement ('' = remove). Longest first.
  requireLetterAfter: false,            // optional: only match when a letter of this script follows
  examples: [                           // MUST change exactly like this (≥ 1)
    { input: 'Tóm tắt bài này giúp em ạ', output: 'Tóm tắt bài này giúp em' },
  ],
  keep: [                               // MUST stay unchanged (≥ 1): your near-misses
    'Chữ "ạ" nghĩa là gì',
  ],
}
```

Rules run in array order, and earlier rules can expose matches for later ones.

How positions work (all of them also require a real word boundary at both ends):

| position       | the match must…                                                   |
| -------------- | ----------------------------------------------------------------- |
| `anywhere`     | sit on word boundaries                                            |
| `clause-start` | be at the start of the text or right after whitespace/punctuation |
| `clause-end`   | be at the end of the text or right before whitespace/punctuation  |
| `standalone`   | be a whole clause on its own (both of the above)                  |

### 3. Add the rule test (copy the Thai one)

Copy `src/languages/th/rules.test.ts` to `src/languages/<code>/rules.test.ts` and change the import.
It's table-driven: every `examples` entry and every `keep` entry becomes a test, and each rule
is checked in isolation. It also checks that ids are unique and each rule has at least one example and one keep case.

### 4. Check it

```bash
npm test
```

Then try a few real messages from native speakers. Good `keep` cases come from real near-misses:
words that _contain_ your phrase, or sentences where the phrase carries meaning.

### 5. (Optional) Interface language

The toolbar/popup UI strings live in `src/i18n/index.ts`. Adding a UI language is a separate,
optional step: add a dictionary and extend `UiLang`.

## Add or change a Thai rule

Edit `src/languages/th/rules.ts`. Every phrase you add needs:

- at least one `examples` entry proving it works, and
- a `keep` entry for its most likely false positive.

Traps we already know about: `คะแนน` contains `คะ`, `เสียงรบกวน` (noise) is not a request,
`เวลาทำการ` (business hours) is not "ทำการ + verb", `เจ้า` ends in `จ้า`, and `อะไร` starts with `อะ`.

## Fix a site adapter

Chat sites change their markup often. Each site has one small file in `src/adapters/` with a list of
CSS selectors, tried in order. To fix one:

1. Open the site, inspect the chat input, and find a stable selector (an `id`, `data-testid`, `role` or `aria-label` beats class names).
2. Put the new selector **first** in the list and keep the old ones as fallbacks.
3. If the composer structure changed, update the matching fixture in `tests/fixtures/` so the e2e test reflects it.
4. Run `npm run test:e2e`.

## Pull requests

- Keep PRs small and focused. CI runs lint, typecheck, unit tests, build, the network audit and the e2e smoke test.
- Add a short plain-language entry to `docs/maintainer-log.md`: **What** changed and **Why**.
- By contributing, you agree that your contribution is licensed under the MIT License.
