// Rule-based compression engine. Language-agnostic: it only interprets `LanguagePack` data.
//
// Pipeline: protect (mask code/URLs/numbers/quotes) → apply each rule in order → restore.
// If restoring fails for any reason, the original text is returned untouched.
import { ProtectError, protect, unprotect } from '../protect';
import { detectPack } from '../languages/registry';
import type { CompressionRule, LanguagePack } from '../languages/types';

export interface AppliedRule {
  id: string;
  label: CompressionRule['label'];
  count: number;
}

export interface CompressResult {
  text: string;
  changed: boolean;
  applied: AppliedRule[];
  /** Set when compression was skipped for safety. `text` is then the original. */
  aborted?: string;
  pack?: LanguagePack;
}

interface Match {
  start: number;
  end: number;
  replacement: string;
}

// A "separator" is anything that is not a letter, digit or combining mark in any script.
// Private-use placeholders from the protect module count as separators.
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
const isSeparator = (char: string | undefined) => char === undefined || !WORD_CHAR.test(char);

const segmenterCache = new Map<string, Intl.Segmenter>();
function segmenterFor(locale: string): Intl.Segmenter {
  let seg = segmenterCache.get(locale);
  if (!seg) {
    seg = new Intl.Segmenter(locale, { granularity: 'word' });
    segmenterCache.set(locale, seg);
  }
  return seg;
}

function wordBoundaries(text: string, locale: string): Set<number> {
  const boundaries = new Set<number>([0, text.length]);
  for (const { index, segment } of segmenterFor(locale).segment(text)) {
    boundaries.add(index);
    boundaries.add(index + segment.length);
  }
  return boundaries;
}

function sortedPhrases(rule: CompressionRule): string[] {
  return Object.keys(rule.replacements).sort((a, b) => b.length - a.length);
}

function findMatches(text: string, rule: CompressionRule, pack: LanguagePack): Match[] {
  const boundaries = wordBoundaries(text, pack.code);
  const phrases = sortedPhrases(rule);
  const matches: Match[] = [];

  const positionOk = (start: number, end: number) => {
    const clauseStart = start === 0 || isSeparator(text[start - 1]);
    const clauseEnd = end === text.length || isSeparator(text[end]);
    switch (rule.position) {
      case 'clause-start':
        return clauseStart;
      case 'clause-end':
        return clauseEnd;
      case 'standalone':
        return clauseStart && clauseEnd;
      default:
        return true;
    }
  };

  // Clause-end rules may also start at a syllable break (see LanguagePack.syllableBreak).
  const syllable = rule.position === 'clause-end' ? pack.syllableBreak : undefined;
  const startOk = (i: number) => {
    if (boundaries.has(i)) return true;
    if (!syllable) return false;
    const before = text[i - 1] ?? '';
    const at = text[i] ?? '';
    return !syllable.notAfter.test(before) && !syllable.notAt.test(at);
  };

  let i = 0;
  while (i < text.length) {
    let matched: Match | undefined;
    if (startOk(i)) {
      for (const phrase of phrases) {
        if (!text.startsWith(phrase, i)) continue;
        const end = i + phrase.length;
        if (!boundaries.has(end)) continue;
        if (!positionOk(i, end)) continue;
        if (rule.requireLetterAfter && !pack.script.test(text[end] ?? '')) continue;
        matched = { start: i, end, replacement: rule.replacements[phrase] ?? '' };
        break;
      }
    }
    if (matched) {
      matches.push(matched);
      i = matched.end;
    } else {
      i += 1;
    }
  }
  return matches;
}

const isSpace = (c: string | undefined) => c === ' ' || c === '\t';

/**
 * Apply matches right-to-left. When a phrase is removed outright, tidy the whitespace it
 * leaves behind (only at that spot, never elsewhere in the message).
 */
function applyMatches(text: string, matches: Match[]): string {
  let out = text;
  for (let m = matches.length - 1; m >= 0; m -= 1) {
    const match = matches[m]!;
    let { start, end } = match;
    if (match.replacement === '') {
      const prev = out[start - 1];
      const next = out[end];
      const lineStart = start === 0 || prev === '\n';
      if ((lineStart || isSpace(prev)) && isSpace(next)) {
        // "a ครับ b" → "a b"; "ครับ b" at line start → "b"
        while (isSpace(out[end])) end += 1;
      } else if (lineStart && next === '\n') {
        // A clause that was the whole line: drop the now-empty line.
        end += 1;
      } else if (isSpace(prev) && (next === undefined || next === '\n')) {
        // "a ครับ" → "a"
        while (isSpace(out[start - 1])) start -= 1;
      }
      if (end === out.length && out[start - 1] === '\n' && start > 0 && lineStart) {
        // Removing the final line entirely: also drop the newline before it.
        start -= 1;
      }
    }
    out = out.slice(0, start) + match.replacement + out.slice(end);
  }
  return out;
}

/** Run a single rule on already-masked text. Exported for rule-level tests. */
export function applyRule(
  masked: string,
  rule: CompressionRule,
  pack: LanguagePack,
): { text: string; count: number } {
  const matches = findMatches(masked, rule, pack);
  if (matches.length === 0) return { text: masked, count: 0 };
  return { text: applyMatches(masked, matches), count: matches.length };
}

export interface CompressOptions {
  /** Force a language pack instead of detecting one from the text. */
  pack?: LanguagePack;
  /** Only run these rule ids (used by tests to check one rule in isolation). */
  onlyRules?: string[];
}

export function compress(text: string, options: CompressOptions = {}): CompressResult {
  const pack = options.pack ?? detectPack(text);
  if (!pack || text.trim() === '') return { text, changed: false, applied: [], pack };

  let masked: string;
  let spans: ReturnType<typeof protect>['spans'];
  try {
    ({ masked, spans } = protect(text));
  } catch (error) {
    return { text, changed: false, applied: [], aborted: describe(error), pack };
  }

  const applied: AppliedRule[] = [];
  for (const rule of pack.rules) {
    if (options.onlyRules && !options.onlyRules.includes(rule.id)) continue;
    const result = applyRule(masked, rule, pack);
    if (result.count > 0) {
      applied.push({ id: rule.id, label: rule.label, count: result.count });
      masked = result.text;
    }
  }

  let restored: string;
  try {
    restored = unprotect(masked, spans);
  } catch (error) {
    return { text, changed: false, applied: [], aborted: describe(error), pack };
  }

  return { text: restored, changed: restored !== text, applied, pack };
}

function describe(error: unknown): string {
  if (error instanceof ProtectError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
