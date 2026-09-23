# DESIGN.md — TadTingPai

## 1. Identity & Atmosphere

Non-English speakers pay more tokens for the same thought, which is where the name "token tax"
comes from. The design comes from the physical paperwork of paying tax: a printed receipt slip
with a perforated tear-line, pale-green ledger paper, stamp ink and monospaced figures. The
extension lives _inside someone else's product_ (ChatGPT, Claude, Gemini), so it is quiet:
one thin strip under the chat box that reads like the stub of a receipt.
**Signature element:** the _receipt stub_. The toolbar and the preview panel have a dashed
perforation edge, and all figures are set in tabular monospace like a printed slip. The
preview's savings line is set like a stamped deduction: "−38 tokens".

## 2. Color Palette & Roles

| Token           | Light   | Dark    | Role                                                 |
| --------------- | ------- | ------- | ---------------------------------------------------- |
| --ttp-paper     | #F3F6F2 | #171C19 | panel/popup background (ledger-green-biased neutral) |
| --ttp-ink       | #1C2621 | #E3EAE5 | text                                                 |
| --ttp-ink-muted | #56635B | #9AA89F | labels, "≈ estimate" note                            |
| --ttp-rule      | #C9D3CC | #2E3832 | borders, perforation dashes                          |
| --ttp-ledger    | #1D6A4E | #5FBF94 | accent: primary action (Apply), focus ring           |
| --ttp-stamp     | #B3362B | #F07A6E | the savings stamp ("−N tokens") only                 |

Semantic: good #2F7A3E · warn #8F5B00 · critical #A3261E (dark: #7BC98A · #E0A640 · #F07A6E)
Palette source: Thai government ledger paper + revenue-stamp red ink.

## 3. Typography

No web fonts, because the extension makes zero network calls and ships no font files.
Body/Thai: "Leelawadee UI", "Thonburi", "Noto Sans Thai", "Sukhumvit Set", sans-serif 400/600
Figures/mono: "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace, with tabular-nums
Toolbar 12px · panel body 14px/1.6 (Thai needs tall line-height) · popup hero figure 40px mono (≥3× body)
Measure: preview text columns cap at 60ch.

## 4. Component Styling

Buttons: radius 4px, 28px high in the toolbar and 36px in the panel. Primary = solid --ttp-ledger with
paper text; secondary = 1px --ttp-rule outline; hover darkens the border to --ttp-ink.
Cards: none. Group with rules and spacing only. Text areas: 1px --ttp-rule, radius 4px, no shadow.
Radius cap: 6px (panel corners). Everything else is 4px or 0.

## 5. Layout & Navigation

Toolbar: a single row, `[≈ 1,284 tokens · estimate] ········ [Compress] [Translate to English]`,
with a dashed top edge (the perforation). Panel: a modal anchored above the toolbar. It shows
Before | After side by side (stacked under 520px wide), then the receipt total row, then actions.
Popup (320px): wordmark, then the saved-total hero figure, then settings, then the language switch.
Spacing: 4px base, 8/12/16/24 steps.
Logo expression: wordmark "TadTingPai" (Thai for "just cut it out") in 600 weight. The middle
word "Ting" (cut) is set in --ttp-stamp on a dashed cut-line underline. The logo _is_ the product
promise. Top-left of the popup.

## 6. Depth & Elevation

Border-first. One shadow only, on the open preview panel: 0 8px 24px rgb(0 0 0 / .18).

## 7. Iconography

Library: none. All actions are labelled text buttons, and the only glyph is the close ✕ with aria-label.

## 8. Motion & Copy Voice

Motion: the panel fades and rises 4px in 150ms ease-out (opacity + transform only); otherwise none.
Respect prefers-reduced-motion. Sentence case. The buttons say what happens: "Compress",
"Translate to English", "Use this text", "Keep original". Errors state what failed and the fix,
e.g. "Translation model not downloaded yet. Try again in a minute."

## 9. Do's & Don'ts + Agent Prompt Guide

Do: always label counts as estimates · keep every figure monospace tabular · keep the toolbar ≤32px
tall so it never crowds the host site · scope all CSS inside a Shadow DOM using --ttp-* tokens.
Don't: auto-apply or auto-send anything · use host-site colours · use icons for actions · use
gradients or blur · use default "AI app" tropes (purple gradients, glassmorphism, sparkle icons, Inter as display type).
Agents: re-read this file before EVERY UI task; every value must trace to sections 2-8.

## Distinctiveness check (REQUIRED)

The default for "AI helper extension" is a floating purple sparkle button with a glassy popover and
Inter. I rejected that. This design is a tax-receipt stub: ledger-green paper, dashed perforation,
monospace figures and one red savings stamp. It sits flush under the chat box and reads as a
receipt, not a chatbot.
