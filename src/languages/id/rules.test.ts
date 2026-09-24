import { describe, expect, it, vi as mock } from 'vitest';
import { compress } from '../../core/compress';
import { canTranslate, type TranslatorApi } from '../../core/translate';
import { detectPack } from '../registry';
import { describePack } from '../pack-cases';
import indonesian from './index';

describePack(indonesian);

describe('Indonesian detection and full pipeline', () => {
  it('is picked only when Indonesian words appear, never for plain English', () => {
    expect(detectPack('Tolong jelaskan apa itu API')?.code).toBe('id');
    expect(detectPack('Please explain what an API is, thanks!')).toBeUndefined();
    // One marker word alone ("dan" is also a name) is not enough.
    expect(detectPack('Say hi to Dan')).toBeUndefined();
    expect(detectPack('ช่วยสรุปบทความนี้หน่อยครับ')?.code).toBe('th');
  });

  it('never touches English even if a phrase would match', () => {
    const english = 'Hai, please help. Thanks deh';
    expect(compress(english)).toMatchObject({ text: english, changed: false });
  });

  it('runs every rule and keeps code, URLs and numbers byte-identical', () => {
    const input =
      'Halo kak, tolong jelaskan fungsi `sum(a, b)` di https://example.com/docs?id=7 dong. Terima kasih banyak!';
    const result = compress(input);
    expect(result.pack?.code).toBe('id');
    expect(result.text).toBe('jelaskan fungsi `sum(a, b)` di https://example.com/docs?id=7.');
    expect(result.applied.map((r) => r.id)).toEqual([
      'id.greetings',
      'id.request-openers',
      'id.particles',
      'id.thanks',
    ]);
  });

  it('asks the Translator API for id → en', async () => {
    const api: TranslatorApi = {
      availability: mock.fn(async () => 'available' as const),
      create: mock.fn(),
    } as unknown as TranslatorApi;
    expect(await canTranslate(api, indonesian.code)).toBe(true);
    expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'id', targetLanguage: 'en' });
  });
});
