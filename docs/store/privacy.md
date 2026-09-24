# TadTingPai privacy policy

_Last updated: 2026-09-24_

TadTingPai is a browser extension that runs entirely on your device.

**What it reads.** On chatgpt.com, chat.openai.com, claude.ai and gemini.google.com it reads the
text in the chat box so it can estimate the token count and offer a shorter or translated
version. This happens locally, in your browser.

**What it stores.** In `chrome.storage.local`, on your device only:

- your settings (which sites show the toolbar, which compression rules are on, interface language)
- a counter of tokens saved: a running total, how many times you used it, and per-day totals
  for the last 30 days
- for each supported site, whether the toolbar found the chat box last time, and which page
  selector matched (used for the popup's status line)

Your messages are never stored.

**What it sends.** Nothing. The extension makes no network requests: no servers, no analytics,
no crash reports. Translation uses Chrome's built-in on-device translator. Chrome may download
its language model the first time, which is a Chrome feature and not a request made by
TadTingPai.

**Reporting a broken site.** If you click "Report a broken site" in the popup, your browser opens
a GitHub issue form filled in with the site name, the toolbar status, the matching page
selectors and the extension and Chrome versions. It contains nothing you typed. Nothing is sent
unless you submit that form yourself on GitHub.

**Removing your data.** Uninstalling the extension deletes everything it stored. "Reset counter"
in the popup clears the savings figures.

**Contact.** https://github.com/TokenMaiPor/tad-ting-pai/issues
