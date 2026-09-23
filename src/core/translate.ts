// Translation with Chrome's built-in, on-device Translator API (Chrome 138+ desktop).
// Nothing is sent to a server: Chrome downloads a language model once, then translates locally.
// If the API is missing or does not support the language pair, the button stays hidden.
import { findProtectedSpans, type ProtectedKind } from '../protect';
import { compress } from './compress';
import type { LanguagePack } from '../languages/types';

export type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

/** The subset of the Translator API we use. Injected so tests can mock it. */
export interface TranslatorApi {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<{ translate(text: string): Promise<string>; destroy?: () => void }>;
}

export function getTranslatorApi(scope: unknown = globalThis): TranslatorApi | undefined {
  const api = (scope as { Translator?: TranslatorApi }).Translator;
  return api && typeof api.availability === 'function' && typeof api.create === 'function'
    ? api
    : undefined;
}

/** True when the pair can be used now or after a one-time model download. */
export async function canTranslate(
  api: TranslatorApi | undefined,
  sourceLanguage: string,
  targetLanguage = 'en',
): Promise<boolean> {
  if (!api) return false;
  try {
    const availability = await api.availability({ sourceLanguage, targetLanguage });
    return availability !== 'unavailable';
  } catch {
    // e.g. blocked by the page's Permissions-Policy
    return false;
  }
}

// Kept verbatim during translation. Numbers are left to the translator (it keeps them) but
// are checked afterwards, see `missingNumbers`.
const KEEP_VERBATIM: ProtectedKind[] = ['code-block', 'inline-code', 'url', 'email', 'quote'];

interface Piece {
  text: string;
  translate: boolean;
}

export function splitForTranslation(text: string): Piece[] {
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const span of findProtectedSpans(text)) {
    if (!KEEP_VERBATIM.includes(span.kind)) continue;
    if (span.start > cursor) pieces.push({ text: text.slice(cursor, span.start), translate: true });
    pieces.push({ text: span.text, translate: false });
    cursor = span.end;
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), translate: true });
  return pieces;
}

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const normalizeDigits = (s: string) => s.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));

/** Numbers in `source` that do not appear in `translated` (Thai digits count as Arabic). */
export function missingNumbers(source: string, translated: string): string[] {
  const numbers = (s: string) =>
    (normalizeDigits(s).match(/\d+(?:[.,:/]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ''));
  const available = numbers(translated);
  const missing: string[] = [];
  for (const n of numbers(source)) {
    const i = available.indexOf(n);
    if (i === -1) missing.push(n);
    else available.splice(i, 1);
  }
  return missing;
}

export interface TranslateOptions {
  api: TranslatorApi;
  pack: LanguagePack;
  appendReplyHint: boolean;
  onDownloadProgress?: (fraction: number) => void;
}

export interface TranslateResult {
  text: string;
  missingNumbers: string[];
}

export async function translateMessage(
  text: string,
  options: TranslateOptions,
): Promise<TranslateResult> {
  const { api, pack } = options;
  const translator = await api.create({
    sourceLanguage: pack.code,
    targetLanguage: 'en',
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        const loaded = (event as Event & { loaded?: number }).loaded;
        if (typeof loaded === 'number') options.onDownloadProgress?.(loaded);
      });
    },
  });

  try {
    // Drop polite particles, greetings and fillers first. Translators render them literally
    // ("ครับ" → "sir", "ขอบคุณล่วงหน้า" → "Thank you in advance"), which reads oddly and costs tokens.
    const compressed = compress(text, { pack });
    const source = compressed.aborted ? text : compressed.text;

    const pieces = splitForTranslation(source);
    const out: string[] = [];
    for (const [i, piece] of pieces.entries()) {
      if (!piece.translate) {
        out.push(piece.text);
        continue;
      }
      out.push(
        await translateChunk(piece.text, pack, translator, {
          // A piece right after code/a link/a quote on the same line continues that sentence.
          continuesLine: i > 0 && !piece.text.startsWith('\n'),
          // A piece right before code/a link/a quote on the same line does not end a sentence.
          continuedOnLine: i < pieces.length - 1 && !piece.text.endsWith('\n'),
        }),
      );
    }
    let result = out.join('');
    if (options.appendReplyHint && pack.replyHint)
      result = `${result.trimEnd()}\n\n${pack.replyHint}`;
    return { text: result, missingNumbers: missingNumbers(text, result) };
  } finally {
    translator.destroy?.();
  }
}

/**
 * Translators treat every fragment as a whole sentence: "ดูที่ " becomes "Look at." and the
 * text after a quote starts with a capital letter. Undo that where the fragment is really the
 * middle of a line.
 */
export function joinFragment(
  translated: string,
  { continuesLine, continuedOnLine }: { continuesLine: boolean; continuedOnLine: boolean },
): string {
  let out = translated;
  // Lowercase the first letter unless it is "I" or an acronym (API, URL…).
  if (continuesLine) out = out.replace(/^([A-Z])(?![A-Z]|\b)/, (c) => c.toLowerCase());
  if (continuedOnLine) out = out.replace(/\.$/, '');
  return out;
}

/** Translate line by line so line breaks and lists survive; keep surrounding whitespace. */
async function translateChunk(
  chunk: string,
  pack: LanguagePack,
  translator: { translate(text: string): Promise<string> },
  position: { continuesLine: boolean; continuedOnLine: boolean },
): Promise<string> {
  const lines = chunk.split('\n');
  const last = lines.length - 1;
  const translated = await Promise.all(
    lines.map(async (line, index) => {
      if (!pack.script.test(line)) return line; // nothing in the source language
      // Keep indentation and list markers ("- ", "1. ") out of the translator's hands.
      const lead = line.match(/^\s*(?:(?:[-*+•]|\d+[.)])\s+)?/)?.[0] ?? '';
      const trail = line.match(/\s*$/)?.[0] ?? '';
      const core = line.slice(lead.length, line.length - trail.length);
      const english = joinFragment(await translator.translate(core), {
        // Only when nothing but spaces precedes it (not a list marker like "- ").
        continuesLine: index === 0 && position.continuesLine && !/\S/.test(lead),
        continuedOnLine: index === last && position.continuedOnLine,
      });
      return lead + english + trail;
    }),
  );
  return translated.join('\n');
}
