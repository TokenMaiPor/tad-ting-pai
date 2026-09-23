// Token counting with the o200k_base encoding (GPT-4o family). Claude and Gemini use their own
// tokenizers, so every number shown to users is labelled as an estimate.
//
// The 2.3 MB rank table lives only in the background service worker (see
// entrypoints/background.ts). Content scripts ask for counts by message, so the chat pages
// never load the tokenizer themselves.

export interface TokenEncoder {
  encode(
    text: string,
    allowedSpecial?: string[] | 'all',
    disallowedSpecial?: string[] | 'all',
  ): number[];
}

export const COUNT_MESSAGE = 'ttp:count';

export interface CountRequest {
  type: typeof COUNT_MESSAGE;
  texts: string[];
}

export interface CountResponse {
  counts: number[];
}

export function isCountRequest(value: unknown): value is CountRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<CountRequest>;
  return (
    v.type === COUNT_MESSAGE &&
    Array.isArray(v.texts) &&
    v.texts.every((t) => typeof t === 'string')
  );
}

/** Loads the real o200k_base tokenizer. Only called in the background worker. */
export async function loadO200k(): Promise<TokenEncoder> {
  const [{ Tiktoken }, { default: ranks }] = await Promise.all([
    import('js-tiktoken/lite'),
    import('js-tiktoken/ranks/o200k_base'),
  ]);
  return new Tiktoken(ranks);
}

const CACHE_LIMIT = 64;

/**
 * Returns a `count(text)` function that loads the encoder on first use and remembers recent
 * results (users often count the same draft repeatedly while typing).
 */
export function createTokenCounter(load: () => Promise<TokenEncoder>) {
  let encoder: Promise<TokenEncoder> | undefined;
  const cache = new Map<string, number>();

  return async function count(text: string): Promise<number> {
    if (text === '') return 0;
    const cached = cache.get(text);
    if (cached !== undefined) {
      // Refresh recency.
      cache.delete(text);
      cache.set(text, cached);
      return cached;
    }
    encoder ??= load().catch((error: unknown) => {
      encoder = undefined; // allow a retry next time
      throw error;
    });
    // Treat special-token strings like "<|endoftext|>" as plain text instead of throwing.
    const value = (await encoder).encode(text, [], []).length;
    cache.set(text, value);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return value;
  };
}

/** Trailing-edge debounce for the live counter. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
