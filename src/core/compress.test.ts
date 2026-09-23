import { describe, expect, it } from 'vitest';
import { compress } from './compress';
import { detectPack, getPack } from '../languages/registry';
import type { LanguagePack } from '../languages/types';

describe('compress: full Thai pipeline', () => {
  it.each([
    ['สวัสดีครับ รบกวนช่วยสรุปบทความนี้ให้หน่อยได้ไหมครับ ขอบคุณล่วงหน้านะครับ', 'สรุปบทความนี้'],
    ['ฉันอยากให้คุณช่วยแปลย่อหน้านี้เป็นภาษาอังกฤษให้หน่อยนะคะ', 'แปลย่อหน้านี้เป็นภาษาอังกฤษ'],
    ['แบบว่าอยากจะรู้ในเรื่องของภาษีเงินได้ค่ะ', 'อยากรู้เรื่องภาษีเงินได้'],
    ['หวัดดีค่ะ\nกรุณาทำการวิเคราะห์ข้อมูลยอดขายนะคะ\nขอบคุณค่ะ', 'วิเคราะห์ข้อมูลยอดขาย'],
  ])('%j → %j', (input, expected) => {
    const result = compress(input);
    expect(result.text).toBe(expected);
    expect(result.changed).toBe(true);
    expect(result.pack?.code).toBe('th');
  });

  it('reports which rules fired and how often', () => {
    const result = compress('ขอบคุณครับ ช่วยอธิบายเพิ่มได้ไหมคะ');
    expect(result.applied).toEqual([
      expect.objectContaining({ id: 'th.polite-particles', count: 2 }),
      expect.objectContaining({ id: 'th.thanks', count: 1 }),
    ]);
  });

  it('is idempotent: compressing twice gives the same result', () => {
    const once = compress('สวัสดีครับ รบกวนช่วยแปลให้หน่อยนะคะ อ่ะ').text;
    expect(compress(once).text).toBe(once);
  });
});

describe('compress: protected content is never changed', () => {
  it('keeps code, inline code, URLs, e-mails, numbers and quotes byte-identical', () => {
    const input = [
      'ช่วยแก้โค้ดนี้ให้หน่อยครับ',
      '```js',
      'const msg = "ขอบคุณครับ"; // ครับ',
      '```',
      'ใช้ `npm run ครับ` แล้ว error ครับ ดู https://example.com/ครับ ด้วยนะคะ',
      'ส่งเมลหา somchai@example.com ภายใน ๓ วัน หรือ 1,250.50 บาทค่ะ',
      'เขาพิมพ์ว่า "สวัสดีครับ" และ “ขอบคุณค่ะ” ครับ',
    ].join('\n');
    const expected = [
      'ช่วยแก้โค้ดนี้',
      '```js',
      'const msg = "ขอบคุณครับ"; // ครับ',
      '```',
      'ใช้ `npm run ครับ` แล้ว error ดู https://example.com/ครับ ด้วย',
      'ส่งเมลหา somchai@example.com ภายใน ๓ วัน หรือ 1,250.50 บาท',
      'เขาพิมพ์ว่า "สวัสดีครับ" และ “ขอบคุณค่ะ”',
    ].join('\n');
    expect(compress(input).text).toBe(expected);
  });

  it('aborts and returns the original when the text cannot be protected safely', () => {
    const input = 'ขอบคุณครับ \uE123';
    const result = compress(input);
    expect(result.text).toBe(input);
    expect(result.changed).toBe(false);
    expect(result.aborted).toMatch(/private-use/);
  });

  it('aborts if a rule damages a placeholder (defence in depth)', () => {
    const evil: LanguagePack = {
      code: 'th',
      name: { en: 'Evil', native: 'Evil' },
      script: /[ก-๛]/,
      replyHint: '',
      rules: [
        {
          id: 'test.eat-placeholders',
          label: { en: 'x', native: 'x' },
          description: 'Deliberately broken rule for testing.',
          position: 'anywhere',
          replacements: { '\uE000': '' },
          examples: [],
          keep: [],
        },
      ],
    };
    const input = 'ดู `x` ครับ';
    const result = compress(input, { pack: evil });
    expect(result.text).toBe(input);
    expect(result.aborted).toBeTruthy();
  });
});

describe('compress: no-ops', () => {
  it('leaves English and empty text alone', () => {
    expect(compress('Please summarize this article.').changed).toBe(false);
    expect(compress('Please summarize this article.').pack).toBeUndefined();
    expect(compress('   ', { pack: getPack('th') }).changed).toBe(false);
    expect(compress('').text).toBe('');
  });

  it('reports "not changed" for Thai text with nothing to remove', () => {
    const result = compress('คะแนนสอบของฉันคือเท่าไร');
    expect(result.changed).toBe(false);
    expect(result.applied).toEqual([]);
  });

  it('preserves intentional spacing and newlines away from removals', () => {
    const input = 'หัวข้อ:  สรุป\n\n- ข้อหนึ่ง\n- ข้อสอง';
    expect(compress(input).text).toBe(input);
  });
});

describe('registry.detectPack', () => {
  it('picks Thai for Thai text, nothing for pure English', () => {
    expect(detectPack('ช่วยสรุปหน่อย')?.code).toBe('th');
    expect(detectPack('hello')).toBeUndefined();
  });

  it('chooses the pack whose script dominates', () => {
    const latin: LanguagePack = {
      code: 'xx',
      name: { en: 'Latin test', native: 'Latin test' },
      script: /[a-z]/g,
      replyHint: '',
      rules: [],
    };
    const th = getPack('th')!;
    expect(detectPack('abc defgh ครับ', [th, latin])?.code).toBe('xx');
    expect(detectPack('ab ช่วยสรุปหน่อยครับ', [th, latin])?.code).toBe('th');
  });
});
