// Discovers every language pack at build time. Core code asks the registry, never a
// specific pack, so adding src/languages/<code>/index.ts is all a new language needs.
import type { LanguagePack } from './types';

const modules = import.meta.glob<{ default: LanguagePack }>('./*/index.ts', { eager: true });

export const languagePacks: LanguagePack[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.code.localeCompare(b.code));

export function getPack(code: string): LanguagePack | undefined {
  return languagePacks.find((p) => p.code === code);
}

function markersFound(text: string, words: string[]): number {
  const present = new Set(text.toLowerCase().split(/[^\p{L}\p{M}]+/u));
  return words.filter((w) => present.has(w)).length;
}

/**
 * Pick the pack whose script appears most in the text. Packs with `markers` (shared scripts
 * such as Latin) only count when enough of their marker words appear. Returns undefined for
 * e.g. pure English.
 */
export function detectPack(
  text: string,
  packs: LanguagePack[] = languagePacks,
): LanguagePack | undefined {
  let best: LanguagePack | undefined;
  let bestCount = 0;
  for (const pack of packs) {
    if (pack.markers && markersFound(text, pack.markers.words) < pack.markers.min) continue;
    const global = new RegExp(
      pack.script.source,
      pack.script.flags.includes('g') ? pack.script.flags : pack.script.flags + 'g',
    );
    const count = text.match(global)?.length ?? 0;
    if (count > bestCount) {
      best = pack;
      bestCount = count;
    }
  }
  return best;
}
