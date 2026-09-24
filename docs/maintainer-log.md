# Maintainer log

A short, plain-language note for every change: what changed and why. Newest at the bottom.

## Design notes (DESIGN.md)

**What:** Added `DESIGN.md`, the visual rulebook for the toolbar, preview panel and popup.
**Why:** The toolbar sits inside ChatGPT, Claude and Gemini, so it has to stay small and not clash with them. The theme is a tax receipt (a dashed "tear line" and number-style figures), so it looks like its own thing. It uses no web fonts, because the extension must not load anything from the internet.

## Project skeleton

**What:** Set up the extension with WXT (a build tool for browser extensions) and strict TypeScript. It has three empty entry points: a background worker, a content script for the 3 chat sites, and a popup.
**Why:** WXT handles the Manifest V3 details and reloads the extension during development. The only permission is `storage`. The extension reads the 3 chat sites through its content script and nothing else.

## Lint, tests, formatting

**What:** Added ESLint, Vitest and Prettier. ESLint now **fails the build if code uses `fetch`, `XMLHttpRequest`, `WebSocket` or `EventSource`**.
**Why:** "No network calls" is a promise to users, so a tool enforces it and nobody has to remember it.

## Interface text in Thai and English

**What:** A small dictionary of every label, button and message in Thai and English (`src/i18n/`).
**Why:** The popup lets people switch the interface language instantly. Chrome's built-in translation system can't switch without a browser restart, so we keep our own.

## Toolbar

**What:** The thin strip under the chat box: "≈ 1,284 tokens · estimate", plus the **Compress** and **Translate to English** buttons (`src/ui/toolbar.ts`).
**Why:** It's drawn inside a Shadow DOM, a sealed-off area of the page, so ChatGPT/Claude/Gemini styles can't break it and ours can't break theirs. Key presses inside it are stopped from reaching the site, so pressing Enter on our buttons can never send a message.

## Before/after preview

**What:** A dialog that shows the original and the new text side by side with token counts and the saving ("−38 tokens"). Buttons: **Use this text** / **Keep original** / Copy. Esc and clicking outside cancel. Tab stays inside the dialog.
**Why:** The user always sees exactly what will change and has to confirm it. Nothing is applied or sent automatically.

## Popup

**What:** The toolbar icon's popup shows total tokens saved, how many times it was used, which sites show the toolbar, whether to add "Reply in Thai." after translating, the interface language (ไทย / English) and a two-click reset.
**Why:** It gives users one place to see what they've saved and control the extension. All settings stay in `chrome.storage.local` on their own device.

## Test pages that copy each site's chat box

**What:** Three small HTML pages (`tests/fixtures/`) that copy the chat-box structure of ChatGPT, Claude and Gemini. They count any "send" (button click, Enter key or form submit).
**Why:** The real sites need a login and change often. These pages let automated tests prove the toolbar appears and that **nothing is ever sent**.

## Protecting code, links, numbers and quotes

**What:** Before any rule runs, code blocks, `inline code`, URLs, e-mails, numbers (including Thai digits ๑๒๓) and quoted text are swapped for invisible placeholders, then swapped back afterwards (`src/protect/`). 25 tests, 100% of lines covered.
**Why:** Compression must never damage code or facts. If a placeholder goes missing or moves, the extension gives up and keeps the original text, so it never guesses.

## Language packs, Thai first

**What:** A language is now just a data file (`src/languages/th/rules.ts`). Thai has 9 rules: polite particles (ครับ/ค่ะ/นะคะ…), casual particles (อ่ะ/อะ), standalone greetings, request openers (ฉันอยากให้คุณช่วย…), request endings (…ให้หน่อยได้ไหม), fillers (แบบว่า/คือว่า), standalone thanks, "ทำการ" + verb, and a few wordy phrases (ในเรื่องของ → เรื่อง). Each rule lists examples that must change and examples that must stay the same.
**Why:** Contributors can add a language or a rule without touching the engine. The "must stay the same" examples document the traps: "คะแนน" is not "คะ", "เสียงรบกวน" (noise) is not a request, and "เวลาทำการ" (business hours) keeps "ทำการ".

## Compression engine and rule tests

**What:** The engine only removes a phrase when it sits on a real word boundary (using the browser's Thai word splitter) and in the right place in the sentence (start or end of a clause). Tests are generated from each rule's own examples, so every rule is tested automatically (57 rule tests plus 15 engine tests).
**Why:** Deleting text from Thai safely is hard because Thai has no spaces between words. Word-boundary checks keep us from cutting words in half. Where the dictionary doesn't know a particle like "อะ", a small syllable check handles it, and that check still keeps "เจ้า" intact.

## Token counter

**What:** Counts tokens with OpenAI's o200k_base tokenizer (GPT-4o), loaded only in the background worker and only when first needed, with a small cache.
**Why:** The tokenizer data is 2.3 MB. Keeping it out of the chat pages means the sites stay fast. Counts are always labelled "estimate" because Claude and Gemini count a little differently.

## Site adapters (ChatGPT, Claude, Gemini)

**What:** One small file per site in `src/adapters/`. It only says where the chat box is and where the toolbar goes. Each lists a few fallback locations in case a site renames things.
**Why:** When a site changes its layout, the fix is a one-line change in one file. Writing into the chat box is shared code that behaves like real typing (with a paste fallback), so the site's editor and send button stay in sync.

## Wiring it together on the page

**What:** The content script finds the chat box, puts the toolbar right under it, updates the token estimate as you type, and runs Compress/Translate through the preview. It re-attaches when these single-page apps redraw the composer. If you edited the text while the preview was open, it refuses to apply and asks you to press the button again.
**Why:** This is the core promise: **the extension never sends anything.** Automated tests on all three copied sites confirm the "send" counter stays at 0.

## Translate to English (on-device)

**What:** Uses Chrome's built-in Translator API. The button only appears when the browser says Thai→English is possible. Code, links and quoted text are kept as-is, lists keep their bullets, and "Reply in Thai." is added at the end (can be turned off). If a number from your message is missing in the translation, the preview warns you.
**Why:** It's on-device, so your text never goes to a translation server. The first use may download Chrome's language model, and the button shows the download progress.

## Settings and "tokens saved"

**What:** Settings and the saved-tokens counter live in `chrome.storage.local`. Savings are added only when you press **Use this text**, and a translation that comes out longer never subtracts from your total. The popup and every open chat tab update instantly when settings change.
**Why:** The number in the popup should be honest: it only counts what you actually used.

## Open-source docs

**What:** `README.md` (English) and `README.th.md` (Thai) cover what the extension does, privacy, why counts are estimates, install steps and a manual release checklist. `CONTRIBUTING.md` walks through adding a language step by step, `LICENSE` is MIT, and `SECURITY.md` covers private reporting and our promises.
**Why:** Contributors should be able to add a language without asking anyone, and users should be able to check the privacy claims themselves.

## GitHub Actions

**What:** On every pull request (and on pushes to main): lint, typecheck, unit tests with the coverage threshold, build, the privacy audit, then the Chromium end-to-end test. The built extension is uploaded as a downloadable artifact.
**Why:** Nothing gets merged unless it builds, passes the tests and still makes zero network calls.

## Design and accessibility review

**What:** Checked the UI against `DESIGN.md` and a list of common "looks AI-made" design patterns. Every colour pair meets WCAG AA contrast in light and dark mode (4.85:1 to 14.29:1). Fixed one real problem: the toolbar had a see-through background. If your computer is in light mode but ChatGPT is in dark mode, the text would have been dark on dark. It now has its own background.
**Why:** The toolbar sits on other companies' pages, so it can't assume their colours.

## Privacy audit script

**What:** `npm run audit:network` scans the built extension for any network-capable code (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, …), remote scripts and extra permissions. It found one: Vite's build tool had added a small `fetch()` helper for preloading files. It only ever loaded the extension's own files, but we turned it off so the rule stays absolute.
**Why:** "No network" is a promise we check on the actual shipped files, not just the source.

## Final verification

**What:** Ran every acceptance check in the plan and recorded the real output: lint, typecheck, 127 unit tests, build, 6 end-to-end browser tests and the privacy audit.
**Why:** "Done" means the checks actually ran and passed.

**Found during final verification:** one end-to-end test failed now and then. The cause was real, not a test glitch. The first time the tokenizer loads it takes a second or more, and Compress used to wait for the token counts before showing anything, so on a slow machine the buttons could sit greyed out. Now the preview opens straight away and shows "counting…" until the numbers arrive. Counting gives up after 20 seconds instead of hanging, and the tokenizer starts loading as soon as a chat page opens. After the fix, the full browser suite passed 18 out of 18 runs (every test three times).

## Rename · Token Tax Saver → TadTingPai

**What:** Renamed the project everywhere: the extension name in the manifest, `package.json` (`tad-ting-pai`), all READMEs and docs, the text in the UI, and the page element (`<tad-ting-pai>`). The internal code prefix also changed from `tts` to `ttp`. The popup wordmark now puts "Ting" (cut) in red on a dashed cut line. The install steps in both READMEs now match the Chrome steps, including pinning the icon. `.gitignore` now excludes `test-results/` and `.output/`.
**Why:** TadTingPai (Thai for "just cut it out") says what the extension does in the language of its first users. Build output and test artifacts don't belong in the repository.

## Docs · How-to-use section and a more visible Thai link

**What:** Both READMEs now have step-by-step usage after installing (where the strip appears, reload tip, Compress → preview → Use this text, the popup, and switching the interface to Thai). The Thai README link at the top of README.md is now prominent.
**Why:** A user installed the extension and couldn't find the Thai guide or what to do next.

## Icons

**What:** Added the TadTingPai icon (`public/icon/16, 32, 48, 128.png` and `icon.svg`, a yellow chat bubble cut in two on indigo). The manifest uses it for the extension (`icons`) and for the toolbar button (`action.default_icon`, with the title "TadTingPai").
**Why:** Chrome shows the extension icon on the extensions page and in the Web Store, and the toolbar icon is what people click to open the popup. Before this, Chrome showed a grey letter "T".

## Translation reads more naturally

**What:** Before translating, the message now goes through the same Thai compression rules, so polite particles, greetings, thanks and fillers are removed first. Pieces of a sentence that sit between code, links or quotes are joined back naturally: no capital letter in the middle of a line and no period stuck before a link. Also: GitHub Actions moved to v7 (Node 24), and the repo now has topics.
**Why:** A tester said the English looked odd. The translator was rendering "ครับ" literally ("sir"), translating "สวัสดี…ขอบคุณล่วงหน้า" into full English sentences, and treating every fragment as a separate sentence ("Look at. https://…"). Chrome's on-device model couldn't be downloaded in our automated browser, so these fixes are tested with a translator stand-in that copies those habits, not with the real model.

## Repo polish for the first public release

**What:** The README (both languages) now has the icon, CI/release/license badges, real screenshots of the toolbar and preview (31 → 6 tokens), and a no-coding install from the Release zip. Also added: issue templates (bug report, rule/language idea), a PR checklist, CHANGELOG.md, and repo links and keywords in package.json. Private vulnerability reporting is turned on to match SECURITY.md, and v0.1.0 is published as a GitHub Release.
**Why:** The project is about to be shared with the Claude Thailand community. Most people there won't install Node, so a downloadable zip and clear screenshots matter more than anything else.

## Automatic release zips

**What:** New workflow `.github/workflows/release.yml`. When a release is published, it checks that the tag matches the version in `package.json`, runs the tests, builds the zip with `npm run zip`, runs the privacy audit and attaches the zip to the release. It can also be run by hand for an existing tag. CONTRIBUTING.md now has a short "Releasing" section.
**Why:** The zip on the release is what most people install. Building it in CI from the tagged code means it always matches the source and has passed the same checks, and nobody has to remember to upload it.

## v0.2 · Design for the new pieces

**What:** DESIGN.md got a section 10 for the fallback button, the rule switches, the 7-day strip, the rule chips and the site status line. Every value reuses the existing colours, type and spacing.
**Why:** The design rules say new UI has to trace back to DESIGN.md, so the file had to cover the new pieces before anyone built them.

## v0.2 · Floating fallback button

**What:** The site adapters are now lists of selectors. If the chat box is found but its usual container isn't found within 3 seconds, a small "TadTingPai · Compress" button is pinned near the chat box's top-right corner. It follows the box when the page scrolls or resizes. The old "put it after the input's parent" guess was removed.
**Why:** The sites change their markup often. Before, the strip disappeared without a word or landed in the wrong spot. Now the feature keeps working until someone updates the selector.

## v0.2 · Site status

**What:** A `diagnose()` helper records which selector found the chat box and its container. The content script saves "ok / fallback / not found" per site, only when the status changes, and the popup shows one line per site.
**Why:** Maintainers and users can see that a site broke without opening DevTools.

## v0.2 · Report a broken site

**What:** When a site isn't OK, the popup shows a "Report a broken site" link. It opens a new GitHub issue form (`site_broken.yml`) filled in with the site, the status, the matching selectors, the check time and the extension and Chrome versions.
**Why:** Most broken-site reports would otherwise come in as "it disappeared". The report carries exactly what's needed to fix a selector, and nothing the user typed.

## v0.2 · Tests for a redesigned site

**What:** The e2e tests load each fixture with `?ttp-broken=1`, which renames every composer container. They check that the fallback button appears near the chat box, that Compress → Use this text still works, that nothing is sent, and that the popup's report link contains no chat text.
**Why:** The fallback only matters when a site breaks, which is exactly when nobody is looking. This checks it on every CI run.

## v0.2 · Rule switches are saved

**What:** Settings have a new `disabledRules` list. Settings saved by v0.1 have no such field, so they read as "every rule on".
**Why:** Needed for the popup's rule switches, and upgrading must not silently change anyone's results.

## v0.2 · The engine skips switched-off rules

**What:** `compress()` takes `disabledRules` and skips those rules. The content script passes the user's list.
**Why:** Some people want to keep, for example, their thank-yous. That is now their choice.

## v0.2 · Rule list in the popup

**What:** A collapsible "Compression rules (16/17 on)" list, grouped by language, with a checkbox and one before → after example per rule. The interface language's rules come first. The list stays open when a change re-draws the popup.
**Why:** People can see what each rule does before turning it off, and the popup stays short when the list is closed.

## v0.2 · Rule chips in the preview

**What:** The list of changes under the preview is now a row of small outlined chips, like "Removed polite particles ×3".
**Why:** It's easier to see which rules fired, which is also the first step to switching one off.

## v0.2 · Keyboard shortcut

**What:** A manifest command, Alt+Shift+K by default, opens the Compress preview on the current chat tab. The background worker forwards it to the tab. It only opens the preview and never applies or sends anything.
**Why:** Opening the preview without reaching for the mouse is quicker for people who write long prompts. A command is not a permission, so the manifest's privacy footprint is unchanged.

## v0.2 · The engine handles languages with spaces between words

**What:** Packs can set `wordSpacing`, which makes clause edges punctuation or line breaks instead of spaces and makes matching case-insensitive. There are two new rule positions: `clause-head` (a clause start that needs something after it) and `clause-tail` (a clause end that needs something before it). Packs in a shared script can list `markers`, common words that must appear before the pack is used. Thai results are byte-for-byte unchanged.
**Why:** In Thai a space ends a clause. In Vietnamese and Indonesian it only separates words, so the Thai logic would have removed words in the middle of sentences. Markers keep English text from being "compressed" with Indonesian rules.

## v0.2 · Vietnamese

**What:** Four rules: greetings ("Xin chào,"), request openers ("Làm ơn", "Cho mình hỏi"), polite particles at the end of a clause ("ạ", "nhé", "nha") and thanks ("Cảm ơn bạn!"). "Dạ" is left out because it also means "yes".
**Why:** Vietnamese prompts carry the same kind of polite padding as Thai ones. On the store demo sentence it saves 13 of 29 tokens (o200k estimate).

## v0.2 · Indonesian

**What:** Four rules: greetings, request openers ("Tolong", "Bisakah kamu"; a lone "Tolong!" meaning "Help!" is kept), particles ("dong", "sih", "deh") and thanks. "ya" and "mohon" are left out because they carry meaning in some sentences.
**Why:** Indonesian has common openers and particles that are safe to drop, and it shows that a pack also works for a language written in plain Latin letters.

## v0.2 · Tests for the new languages

**What:** A shared `describePack()` turns each rule's examples and keep-cases into tests for any pack. Each new language also has detection tests, a full-pipeline test showing that code, links and numbers stay byte-identical, and a Translator availability test.
**Why:** Contributors can add a language by writing data. The tests come with the data automatically.

## v0.2 · Rule labels per language

**What:** The popup shows each rule's own label: the Thai label when the interface is Thai, the English label otherwise. The interface itself stays Thai/English.
**Why:** It keeps the interface small while still showing rules from every pack.

## v0.2 · Daily savings

**What:** The stats now include per-day totals (by local date), trimmed to the last 30 days every time something is recorded. Days with no savings aren't stored. "Reset counter" clears them too.
**Why:** Needed for the 7-day strip. The 30-day cap keeps storage tiny.

## v0.2 · 7-day strip in the popup

**What:** Seven thin bars under the savings total, with today in stamp red and Thai or English day initials. A hidden table gives screen readers the numbers.
**Why:** A single running total doesn't show whether the habit sticks. A week at a glance does.

## v0.2 · Store screenshots

**What:** `scripts/store-screenshots.mjs` builds five 1280×800 screenshots from the fixture pages (offline, no site branding) into `docs/store/screenshots/`. The popup is rendered at 2× so it stays sharp.
**Why:** The Chrome Web Store needs screenshots, and a script means they can be regenerated after every UI change instead of drifting out of date.

## v0.2 · Store listing and privacy policy

**What:** `docs/store/listing.md` has everything the store dashboard asks for, in EN and TH: summary, description, single-purpose statement, permission reasons and the data-use answers (no data collected). `docs/store/privacy.md` is the privacy policy page to link.
**Why:** Publishing needs the maintainer's own developer account, but everything else can be ready so that step takes minutes.

## v0.2 · Version 0.2.0

**What:** The version is now 0.2.0 in package.json and the lockfile. There's a CHANGELOG entry, both READMEs list the new features and release checks, and the manifest description mentions the three languages.
**Why:** The release workflow requires the tag to match package.json, and users read the README first.
