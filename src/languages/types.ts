// A language pack is pure data. The compression engine in src/core/ knows nothing about any
// specific language; it only interprets these rule shapes. To add a language, create
// src/languages/<code>/index.ts exporting a `LanguagePack` (see CONTRIBUTING.md).

/**
 * Where a match is allowed. All positions also require the match to start and end on a word
 * boundary as reported by `Intl.Segmenter`, so "คะ" never matches inside "คะแนน".
 *
 * - `anywhere`: any word boundary.
 * - `clause-start`: at the start of the text or right after whitespace/punctuation.
 * - `clause-end`: at the end of the text or right before whitespace/punctuation.
 * - `standalone`: both clause-start and clause-end (the match is a whole clause by itself).
 */
export type RulePosition = 'anywhere' | 'clause-start' | 'clause-end' | 'standalone';

export interface RuleExample {
  input: string;
  output: string;
}

export interface CompressionRule {
  /** Stable id, e.g. "th.polite-particles". Used in tests and in the preview's change list. */
  id: string;
  /** Short label shown to users in the preview ("Removed polite particles"). */
  label: { en: string; native: string };
  /** One sentence for contributors: what the rule does and why it is safe. */
  description: string;
  position: RulePosition;
  /**
   * Phrases to find. Each maps to its replacement; `''` means remove.
   * Longer phrases are tried first, so "นะคะ" wins over "คะ".
   */
  replacements: Record<string, string>;
  /** Only match when the next character is a letter of this script (e.g. "ทำการ" + verb). */
  requireLetterAfter?: boolean;
  /** Examples that MUST change exactly as shown. Every rule needs at least one. */
  examples: RuleExample[];
  /** Inputs that must come out unchanged. Every rule needs at least one. */
  keep: string[];
}

export interface LanguagePack {
  /** BCP 47 code, also used for Intl.Segmenter and the Translator API. */
  code: string;
  /** Name in English and in the language itself. */
  name: { en: string; native: string };
  /** Characters that identify the script. Used to decide whether the pack applies. */
  script: RegExp;
  /**
   * Optional syllable-break hints for scripts without spaces. Dictionary segmenters do not
   * know every particle ("อะ" is often glued to the word before it), so clause-end rules may
   * also start a match at a syllable break: the character before the match must not match
   * `notAfter` (e.g. Thai leading vowels เ แ โ ใ ไ, which belong to the next consonant) and
   * the first character must not match `notAt` (vowel signs and tone marks).
   */
  syllableBreak?: { notAfter: RegExp; notAt: RegExp };
  /** Appended after an English translation so the AI answers in the user's language. */
  replyHint: string;
  /** Applied in order. Earlier rules can expose matches for later ones. */
  rules: CompressionRule[];
}
