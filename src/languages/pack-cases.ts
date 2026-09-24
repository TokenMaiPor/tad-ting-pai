// Shared table-driven tests for a language pack (test-only; never imported by extension code).
// Every rule's own `examples` and `keep` lists are the test cases, so adding a rule or an
// example automatically adds tests. Each rule is checked in isolation.
import { describe, expect, it } from 'vitest';
import { compress } from '../core/compress';
import { getPack } from './registry';
import type { LanguagePack } from './types';

export function describePack(pack: LanguagePack) {
  describe(`${pack.name.en} pack metadata`, () => {
    it('is discovered by the registry', () => {
      expect(getPack(pack.code)).toBe(pack);
    });

    it('has unique, namespaced rule ids', () => {
      const ids = pack.rules.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(new RegExp(`^${pack.code}\\.[a-z-]+$`));
    });

    it('writes phrases in lower case when matching is case-insensitive', () => {
      if (!pack.wordSpacing) return;
      for (const rule of pack.rules) {
        for (const phrase of Object.keys(rule.replacements)) {
          expect(phrase).toBe(phrase.toLocaleLowerCase(pack.code));
        }
      }
    });

    it.each(pack.rules.map((r) => [r.id, r] as const))(
      '%s has at least one example and one keep case',
      (_id, rule) => {
        expect(rule.examples.length).toBeGreaterThan(0);
        expect(rule.keep.length).toBeGreaterThan(0);
        expect(rule.label.en).not.toBe('');
        expect(rule.label.native).not.toBe('');
      },
    );
  });

  for (const rule of pack.rules) {
    describe(`rule ${rule.id}`, () => {
      it.each(rule.examples.map((e) => [e.input, e.output] as const))(
        'compresses %j → %j',
        (input, output) => {
          const result = compress(input, { pack, onlyRules: [rule.id] });
          expect(result.text).toBe(output);
          expect(result.applied.map((a) => a.id)).toEqual([rule.id]);
        },
      );

      it.each(rule.keep.map((k) => [k] as const))('keeps %j unchanged', (input) => {
        const result = compress(input, { pack, onlyRules: [rule.id] });
        expect(result.text).toBe(input);
        expect(result.changed).toBe(false);
      });
    });
  }
}
