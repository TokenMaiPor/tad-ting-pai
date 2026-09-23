# Security Policy

## Our promises

TadTingPai is designed so that there is very little to attack:

- **No network access.** The extension makes no network requests of any kind: no server, analytics, telemetry or remote code.
  This is enforced by an ESLint rule on the source and by `npm run audit:network` on the built bundle, both in CI.
- **Minimal permissions.** Only `storage`. The content script runs only on `chatgpt.com`, `chat.openai.com`, `claude.ai` and `gemini.google.com`.
- **Local data only.** Settings and the "tokens saved" counter live in `chrome.storage.local`. Your messages are never stored.
- **Never sends messages.** The extension only replaces the chat box text after you press **Use this text**. It never presses send.
- **On-device translation.** Translation uses Chrome's built-in Translator API, which runs locally after a one-time model download managed by Chrome.

A bug that breaks any of these promises is a security issue. Please report it.

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through GitHub:
**Security → Report a vulnerability** on this repository (private vulnerability reporting).

Please include:

- what you found and its impact (for example "a crafted message makes the extension send a request"),
- steps to reproduce, with the browser version and the affected site,
- a proof of concept if you have one.

We aim to acknowledge reports within **7 days** and to ship a fix, or explain our assessment,
within **30 days**. We're happy to credit you in the release notes if you'd like.

## Scope

In scope: the extension code in this repository and its built output.

Out of scope: vulnerabilities in ChatGPT, Claude, Gemini or Chrome itself (please report those to their vendors),
and issues that require a compromised browser or machine.
