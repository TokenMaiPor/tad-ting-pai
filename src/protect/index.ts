// Protects parts of a message that must never be changed: code blocks, inline code, URLs,
// e-mail addresses, numbers and quoted text.
//
// How it works: each protected span is swapped for a 3-character placeholder built from
// Unicode private-use characters, which real text never contains. Rules run on the masked
// text, then `unprotect` swaps the originals back. If a placeholder went missing, got
// duplicated or moved out of order, `unprotect` throws, and callers must fall back to the
// original text instead of risking a corrupted message.

export type ProtectedKind = 'code-block' | 'inline-code' | 'url' | 'email' | 'quote' | 'number';

export interface ProtectedSpan {
  kind: ProtectedKind;
  start: number;
  end: number;
  text: string;
}

export interface ProtectResult {
  masked: string;
  spans: ProtectedSpan[];
}

export class ProtectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtectError';
  }
}

export const SENTINEL_OPEN = '\uE000';
export const SENTINEL_CLOSE = '\uE001';
const INDEX_BASE = 0xe100;
export const MAX_SPANS = 0xf8ff - INDEX_BASE; // stays inside the BMP private-use area
const PRIVATE_USE_RE = /[\uE000-\uF8FF]/;
const SENTINEL_RE = /\uE000([\uE100-\uF8FF])\uE001/g;

// Order matters: when two patterns overlap at the same start, the earlier one wins.
const PATTERNS: { kind: ProtectedKind; re: RegExp }[] = [
  // Fenced code blocks (``` or ~~~). An unclosed fence protects everything to the end.
  {
    kind: 'code-block',
    re: /(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*(?:\n[\s\S]*?)??(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g,
  },
  // Inline code with any run of backticks: `x`, ``x`y``.
  { kind: 'inline-code', re: /(`+)(?!`)(.+?)(?<!`)\1(?!`)/g },
  { kind: 'url', re: /\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"'“”‘’`]+/gi },
  { kind: 'email', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g },
  // Quoted text: straight double quotes, curly double/single quotes, guillemets, corner brackets.
  { kind: 'quote', re: /"[^"\n]+"|“[^”\n]+”|‘[^’\n]+’|«[^»\n]+»|「[^」\n]+」/g },
  // Numbers: Arabic or Thai digits, with thousand separators, decimals, signs and percent.
  {
    kind: 'number',
    re: /[+\-−]?(?:[0-9๐-๙]+(?:[,.:/][0-9๐-๙]+)*)(?:\s?%)?/g,
  },
];

const count = (s: string, ch: string) => s.split(ch).length - 1;

/** Drop sentence punctuation glued to the end of a URL, but keep balanced parens (Wikipedia). */
function trimUrlTail(url: string): string {
  let value = url;
  while (/[.,;:!?)\]}]$/.test(value)) {
    if (value.endsWith(')') && count(value, '(') >= count(value, ')')) break;
    value = value.slice(0, -1);
  }
  return value;
}

function findSpans(text: string): ProtectedSpan[] {
  const candidates: (ProtectedSpan & { priority: number })[] = [];
  PATTERNS.forEach(({ kind, re }, priority) => {
    re.lastIndex = 0;
    for (const match of text.matchAll(re)) {
      let start = match.index;
      let value = match[0];
      if (kind === 'code-block' && value.startsWith('\n')) {
        // Keep the leading newline outside the protected block.
        start += 1;
        value = value.slice(1);
      }
      if (kind === 'url' || kind === 'email') {
        // "see https://x.com/a." — the final period belongs to the sentence, not the URL.
        value = trimUrlTail(value);
      }
      candidates.push({ kind, start, end: start + value.length, text: value, priority });
    }
  });

  // Resolve overlaps: earliest start wins; on ties, the higher-priority pattern (lower index).
  // One pattern never yields two matches at the same start, so no further tie-break is needed.
  candidates.sort((a, b) => a.start - b.start || a.priority - b.priority);
  const spans: ProtectedSpan[] = [];
  let cursor = 0;
  for (const c of candidates) {
    if (c.start < cursor) continue;
    spans.push({ kind: c.kind, start: c.start, end: c.end, text: c.text });
    cursor = c.end;
  }
  return spans;
}

function placeholder(index: number): string {
  return SENTINEL_OPEN + String.fromCharCode(INDEX_BASE + index) + SENTINEL_CLOSE;
}

/** Mask every protected span. Throws `ProtectError` if the text cannot be protected safely. */
export function protect(text: string): ProtectResult {
  if (PRIVATE_USE_RE.test(text)) {
    throw new ProtectError('Text already contains private-use characters; refusing to mask.');
  }
  const spans = findSpans(text);
  if (spans.length > MAX_SPANS) {
    throw new ProtectError(`Too many protected spans (${spans.length}).`);
  }
  let masked = '';
  let cursor = 0;
  spans.forEach((span, i) => {
    masked += text.slice(cursor, span.start) + placeholder(i);
    cursor = span.end;
  });
  masked += text.slice(cursor);
  return { masked, spans };
}

/**
 * Restore the protected spans. Every placeholder must appear exactly once, in the original
 * order. Anything else means a rule damaged protected content, so we throw.
 */
export function unprotect(masked: string, spans: ProtectedSpan[]): string {
  let expected = 0;
  const restored = masked.replace(SENTINEL_RE, (_match, indexChar: string) => {
    const index = indexChar.charCodeAt(0) - INDEX_BASE;
    if (index !== expected) {
      throw new ProtectError(`Protected span ${index} is out of order (expected ${expected}).`);
    }
    expected += 1;
    const span = spans[index];
    if (!span) throw new ProtectError(`Unknown protected span ${index}.`);
    return span.text;
  });
  if (expected !== spans.length) {
    throw new ProtectError(`Protected spans lost: restored ${expected} of ${spans.length}.`);
  }
  if (PRIVATE_USE_RE.test(restored)) {
    throw new ProtectError('A placeholder was damaged.');
  }
  return restored;
}

/** True when `index` sits inside or at the edge of a placeholder in masked text. */
export function isPlaceholderChar(char: string | undefined): boolean {
  return char !== undefined && PRIVATE_USE_RE.test(char);
}

/** Convenience for callers that only need to know which spans exist (e.g. translation). */
export function findProtectedSpans(text: string): ProtectedSpan[] {
  return findSpans(text);
}
