import { describe, expect, it, vi } from 'vitest';
import {
  canTranslate,
  getTranslatorApi,
  joinFragment,
  missingNumbers,
  splitForTranslation,
  translateMessage,
  type Availability,
  type TranslatorApi,
} from './translate';
import thai from '../languages/th';

const dictionary: Record<string, string> = {
  ช่วยสรุปบทความนี้: 'Summarize this article',
  'ราคา 100 บาท': 'Price 100 baht',
  ดูโค้ดนี้: 'Look at this code',
  แล้วเปิด: 'then open',
  ข้อหนึ่ง: 'Item one',
  'ราคา ๑๒๐ บาท': 'Price 120 baht',
  'ราคา 99 บาท': 'Price baht',
};

function mockApi(availability: Availability = 'available') {
  const translate = vi.fn(async (text: string) => dictionary[text] ?? `[${text}]`);
  const destroy = vi.fn();
  const api: TranslatorApi = {
    availability: vi.fn(async () => availability),
    create: vi.fn(async (options) => {
      const monitor = new EventTarget();
      options.monitor?.(monitor);
      const progress = new Event('downloadprogress') as Event & { loaded: number };
      progress.loaded = 0.5;
      monitor.dispatchEvent(progress);
      return { translate, destroy };
    }),
  };
  return { api, translate, destroy };
}

describe('Translator API detection (button visibility)', () => {
  it('hides the button when the API does not exist', async () => {
    expect(getTranslatorApi({})).toBeUndefined();
    expect(getTranslatorApi({ Translator: { availability: 1 } })).toBeUndefined();
    expect(await canTranslate(undefined, 'th')).toBe(false);
  });

  it('hides the button when th→en is unavailable', async () => {
    expect(await canTranslate(mockApi('unavailable').api, 'th')).toBe(false);
  });

  it('hides the button when availability() throws (e.g. Permissions-Policy)', async () => {
    const api = { ...mockApi().api, availability: vi.fn().mockRejectedValue(new Error('blocked')) };
    expect(await canTranslate(api, 'th')).toBe(false);
  });

  it.each(['available', 'downloadable', 'downloading'] as const)(
    'shows it when %s',
    async (state) => {
      const { api } = mockApi(state);
      expect(getTranslatorApi({ Translator: api })).toBe(api);
      expect(await canTranslate(api, 'th')).toBe(true);
      expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'th', targetLanguage: 'en' });
    },
  );
});

describe('translateMessage', () => {
  it('translates Thai and appends the reply hint', async () => {
    const { api, destroy } = mockApi();
    const progress = vi.fn();
    const result = await translateMessage('ช่วยสรุปบทความนี้', {
      api,
      pack: thai,
      appendReplyHint: true,
      onDownloadProgress: progress,
    });
    expect(result.text).toBe('Summarize this article\n\nReply in Thai.');
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(destroy).toHaveBeenCalled();
  });

  it('can skip the reply hint', async () => {
    const result = await translateMessage('ช่วยสรุปบทความนี้', {
      api: mockApi().api,
      pack: thai,
      appendReplyHint: false,
    });
    expect(result.text).toBe('Summarize this article');
  });

  it('keeps code, URLs and quotes verbatim and preserves line structure', async () => {
    const { api, translate } = mockApi();
    const input =
      'ดูโค้ดนี้\n```js\nconst a = "ครับ";\n```\nแล้วเปิด https://example.com/ไทย\n\n- ข้อหนึ่ง';
    const result = await translateMessage(input, { api, pack: thai, appendReplyHint: false });
    expect(result.text).toBe(
      'Look at this code\n```js\nconst a = "ครับ";\n```\nthen open https://example.com/ไทย\n\n- Item one',
    );
    expect(translate).not.toHaveBeenCalledWith(expect.stringContaining('const'));
  });

  it('warns when a number disappears, and accepts Thai digits turned into Arabic ones', async () => {
    const api = mockApi().api;
    expect(
      (await translateMessage('ราคา ๑๒๐ บาท', { api, pack: thai, appendReplyHint: false }))
        .missingNumbers,
    ).toEqual([]);
    expect(
      (await translateMessage('ราคา 99 บาท', { api, pack: thai, appendReplyHint: false }))
        .missingNumbers,
    ).toEqual(['99']);
  });

  it('destroys the translator even when translation fails', async () => {
    const { api, destroy, translate } = mockApi();
    translate.mockRejectedValueOnce(new Error('model crashed'));
    await expect(
      translateMessage('ช่วยสรุปบทความนี้', { api, pack: thai, appendReplyHint: true }),
    ).rejects.toThrow('model crashed');
    expect(destroy).toHaveBeenCalled();
  });
});

describe('helpers', () => {
  it('splitForTranslation marks verbatim pieces', () => {
    expect(splitForTranslation('ก `x` ข')).toEqual([
      { text: 'ก ', translate: true },
      { text: '`x`', translate: false },
      { text: ' ข', translate: true },
    ]);
  });

  it('missingNumbers ignores thousand separators and counts duplicates', () => {
    expect(missingNumbers('1,000 และ 5 และ 5', '1000 and 5')).toEqual(['5']);
  });
});

describe('natural English (fixes for literal, fragment-by-fragment output)', () => {
  // Behaves like a real sentence translator: every input becomes a capitalised sentence with
  // a period, and polite particles are rendered literally.
  const literal: Record<string, string> = {
    'สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ ขอบคุณล่วงหน้านะครับ':
      'Hello sir, could you please summarize this article for me? Thank you in advance, sir.',
    สรุปบทความนี้: 'Summarize this article',
    ช่วยแก้โค้ดนี้: 'Help fix this code',
    ดูที่: 'Look at',
    เขาพิมพ์ว่า: 'He typed',
    แปลว่าอะไร: 'What does it mean?',
  };
  const sentenceLike = (text: string) => {
    const base = literal[text] ?? `[${text}]`;
    const cap = base.charAt(0).toUpperCase() + base.slice(1);
    return /[.?!]$/.test(cap) ? cap : `${cap}.`;
  };
  const api: TranslatorApi = {
    availability: async () => 'available',
    create: async () => ({ translate: async (t: string) => sentenceLike(t) }),
  };
  const run = (text: string) => translateMessage(text, { api, pack: thai, appendReplyHint: true });

  it('drops polite particles, greetings and thanks before translating', async () => {
    const result = await run(
      'สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ ขอบคุณล่วงหน้านะครับ',
    );
    expect(result.text).toBe('Summarize this article.\n\nReply in Thai.');
    expect(result.text).not.toMatch(/sir|Hello|Thank you/);
  });

  it('keeps a sentence flowing around code and links', async () => {
    const result = await run(
      'ช่วยแก้โค้ดนี้ให้หน่อยครับ `x = 1` ดูที่ https://example.com/docs ครับ',
    );
    expect(result.text).toBe(
      'Help fix this code `x = 1` look at https://example.com/docs\n\nReply in Thai.',
    );
  });

  it('does not start a new sentence after a quote', async () => {
    const result = await run('เขาพิมพ์ว่า "สวัสดีครับ" แปลว่าอะไรคะ');
    expect(result.text).toBe('He typed "สวัสดีครับ" what does it mean?\n\nReply in Thai.');
  });

  it('joinFragment keeps "I" and acronyms capitalised', () => {
    const mid = { continuesLine: true, continuedOnLine: false };
    expect(joinFragment('I think so.', mid)).toBe('I think so.');
    expect(joinFragment('API docs.', mid)).toBe('API docs.');
    expect(joinFragment('Look here.', { continuesLine: false, continuedOnLine: true })).toBe(
      'Look here',
    );
  });
});
