import { describe, expect, it, vi as mock } from 'vitest';
import { compress } from '../../core/compress';
import { canTranslate, type TranslatorApi } from '../../core/translate';
import { detectPack } from '../registry';
import { describePack } from '../pack-cases';
import vietnamese from './index';

describePack(vietnamese);

describe('Vietnamese detection and full pipeline', () => {
  it('is picked for Vietnamese text, not for English, French or Thai', () => {
    expect(detectPack('Làm ơn tóm tắt bài viết này giúp mình')?.code).toBe('vi');
    expect(detectPack('Please summarize this article')).toBeUndefined();
    expect(detectPack('Pouvez-vous être plus précis, s’il vous plaît ?')).toBeUndefined();
    expect(detectPack('ช่วยสรุปบทความนี้หน่อยครับ')?.code).toBe('th');
  });

  it('runs every rule and keeps code, URLs and numbers byte-identical', () => {
    const input =
      'Xin chào, làm ơn giải thích đoạn `const x = 42` và trang https://vi.wikipedia.org/wiki/Hà_Nội nhé. Cảm ơn bạn!';
    const result = compress(input);
    expect(result.pack?.code).toBe('vi');
    expect(result.text).toBe(
      'giải thích đoạn `const x = 42` và trang https://vi.wikipedia.org/wiki/Hà_Nội.',
    );
    expect(result.applied.map((r) => r.id)).toEqual([
      'vi.greetings',
      'vi.request-openers',
      'vi.polite-particles',
      'vi.thanks',
    ]);
  });

  it('matches regardless of case', () => {
    expect(compress('LÀM ƠN dịch câu này').text).toBe('dịch câu này');
  });

  it('asks the Translator API for vi → en', async () => {
    const api: TranslatorApi = {
      availability: mock.fn(async () => 'downloadable' as const),
      create: mock.fn(),
    } as unknown as TranslatorApi;
    expect(await canTranslate(api, vietnamese.code)).toBe(true);
    expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'vi', targetLanguage: 'en' });
  });
});
