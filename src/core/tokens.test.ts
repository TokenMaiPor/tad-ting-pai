import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTokenCounter,
  debounce,
  isCountRequest,
  loadO200k,
  type TokenEncoder,
} from './tokens';

describe('createTokenCounter', () => {
  const fakeEncoder = (): TokenEncoder & { calls: number } => {
    const enc = {
      calls: 0,
      encode(text: string) {
        enc.calls += 1;
        return Array.from(text);
      },
    };
    return enc as unknown as TokenEncoder & { calls: number };
  };

  it('loads the encoder once, lazily', async () => {
    const enc = fakeEncoder();
    const load = vi.fn(async () => enc);
    const count = createTokenCounter(load);
    expect(load).not.toHaveBeenCalled();
    expect(await count('abc')).toBe(3);
    expect(await count('abcd')).toBe(4);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('returns 0 for empty text without loading anything', async () => {
    const load = vi.fn(async () => fakeEncoder());
    expect(await createTokenCounter(load)('')).toBe(0);
    expect(load).not.toHaveBeenCalled();
  });

  it('memoises repeated text and evicts old entries', async () => {
    const enc = fakeEncoder();
    const count = createTokenCounter(async () => enc);
    await count('same');
    await count('same');
    expect(enc.calls).toBe(1);
    for (let i = 0; i < 70; i += 1) await count(`t${i}`);
    await count('same');
    expect(enc.calls).toBe(72);
  });

  it('retries loading after a failure', async () => {
    const load = vi
      .fn<() => Promise<TokenEncoder>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(fakeEncoder());
    const count = createTokenCounter(load);
    await expect(count('x')).rejects.toThrow('boom');
    expect(await count('x')).toBe(1);
  });
});

describe('o200k_base (real tokenizer)', () => {
  it('counts English and Thai, and Thai costs more for the same meaning', async () => {
    const count = createTokenCounter(loadO200k);
    const en = await count('Please summarize this article.');
    const th = await count('ช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ');
    expect(en).toBeGreaterThan(0);
    expect(th).toBeGreaterThan(en);
  });

  it('does not throw on special-token text', async () => {
    const count = createTokenCounter(loadO200k);
    await expect(count('<|endoftext|> hello')).resolves.toBeGreaterThan(0);
  });
});

describe('isCountRequest', () => {
  it('accepts well-formed requests only', () => {
    expect(isCountRequest({ type: 'ttp:count', texts: ['a'] })).toBe(true);
    expect(isCountRequest({ type: 'ttp:count', texts: [1] })).toBe(false);
    expect(isCountRequest({ type: 'other', texts: [] })).toBe(false);
    expect(isCountRequest(null)).toBe(false);
  });
});

describe('debounce', () => {
  afterEach(() => vi.useRealTimers());

  it('fires once after the wait, with the latest args', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    d(2);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith(2);
    d(3);
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
