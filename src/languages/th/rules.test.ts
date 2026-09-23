import { describe, expect, it } from 'vitest';
import { compress } from '../../core/compress';
import { getPack, languagePacks } from '../registry';
import thai from './index';

// Table-driven: every rule's own `examples` and `keep` lists are the test cases, so adding
// a rule (or an example) automatically adds tests. Each rule is checked in isolation.
describe('Thai pack metadata', () => {
  it('is discovered by the registry', () => {
    expect(getPack('th')).toBe(thai);
    expect(languagePacks.map((p) => p.code)).toContain('th');
  });

  it('has unique, namespaced rule ids', () => {
    const ids = thai.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^th\.[a-z-]+$/);
  });

  it.each(thai.rules.map((r) => [r.id, r] as const))(
    '%s has at least one example and one keep case',
    (_id, rule) => {
      expect(rule.examples.length).toBeGreaterThan(0);
      expect(rule.keep.length).toBeGreaterThan(0);
      expect(rule.label.en).not.toBe('');
      expect(rule.label.native).not.toBe('');
    },
  );
});

for (const rule of thai.rules) {
  describe(`rule ${rule.id}`, () => {
    it.each(rule.examples.map((e) => [e.input, e.output] as const))(
      'compresses %j → %j',
      (input, output) => {
        const result = compress(input, { pack: thai, onlyRules: [rule.id] });
        expect(result.text).toBe(output);
        expect(result.applied.map((a) => a.id)).toEqual([rule.id]);
      },
    );

    it.each(rule.keep.map((k) => [k] as const))('keeps %j unchanged', (input) => {
      const result = compress(input, { pack: thai, onlyRules: [rule.id] });
      expect(result.text).toBe(input);
      expect(result.changed).toBe(false);
    });
  });
}
