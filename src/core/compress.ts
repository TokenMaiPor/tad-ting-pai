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
const isSpace = (c: string | undefined) => c === ' ' || c === '\t';

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

// In word-spaced languages a clause edge is the text edge, a line break or punctuation,
// looking past any spaces in between.
const CLAUSE_MARK = /[\p{P}\n]/u;
function clauseEdgeBefore(text: string, i: number): boolean {
  let j = i - 1;
  while (isSpace(text[j])) j -= 1;
  return j < 0 || CLAUSE_MARK.test(text[j]!);
}
function clauseEdgeAfter(text: string, i: number): boolean {
  let j = i;
  while (isSpace(text[j])) j += 1;
  return j >= text.length || CLAUSE_MARK.test(text[j]!);
}

/**
 * Lower-cased copy for case-insensitive matching, but only when lower-casing keeps every
 * character at the same index (it almost always does; "İ" is the classic exception).
 */
function matchText(text: string, pack: LanguagePack): string {
  if (!pack.wordSpacing) return text;
  const lower = text.toLocaleLowerCase(pack.code);
  return lower.length === text.length ? lower : text;
}

function findMatches(text: string, rule: CompressionRule, pack: LanguagePack): Match[] {
  const boundaries = wordBoundaries(text, pack.code);
  const phrases = sortedPhrases(rule);
  const matches: Match[] = [];
  const hay = matchText(text, pack);

  const positionOk = (start: number, end: number) => {
    const clauseStart = pack.wordSpacing
      ? clauseEdgeBefore(text, start)
      : start === 0 || isSeparator(text[start - 1]);
    const clauseEnd = pack.wordSpacing
      ? // A phrase may carry its own punctuation ("xin chào,"), which ends the clause itself.
        clauseEdgeAfter(text, end) || CLAUSE_MARK.test(text[end - 1] ?? '')
      : end === text.length || isSeparator(text[end]);
    switch (rule.position) {
      case 'clause-start':
        return clauseStart;
      case 'clause-end':
        return clauseEnd;
      case 'standalone':
        return clauseStart && clauseEnd;
      case 'clause-head':
        return clauseStart && !clauseEnd;
      case 'clause-tail':
        return clauseEnd && !clauseStart;
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
        if (!hay.startsWith(phrase, i)) continue;
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

/**
 * Apply matches right-to-left. When a phrase is removed outright, tidy the whitespace it
 * leaves behind (only at that spot, never elsewhere in the message).
 */
function applyMatches(text: string, matches: Match[], wordSpacing = false): string {
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
      } else if (wordSpacing && isSpace(prev) && next !== undefined && CLAUSE_MARK.test(next)) {
        // "ngắn gọn nhé." → "ngắn gọn."
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
  return { text: applyMatches(masked, matches, pack.wordSpacing), count: matches.length };
}

export interface CompressOptions {
  /** Force a language pack instead of detecting one from the text. */
  pack?: LanguagePack;
  /** Only run these rule ids (used by tests to check one rule in isolation). */
  onlyRules?: string[];
  /** Rule ids the user switched off in the popup. */
  disabledRules?: readonly string[];
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
    if (options.disabledRules?.includes(rule.id)) continue;
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
