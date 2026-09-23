import { describe, expect, it } from 'vitest';
import {
  MAX_SPANS,
  ProtectError,
  SENTINEL_CLOSE,
  SENTINEL_OPEN,
  findProtectedSpans,
  isPlaceholderChar,
  protect,
  unprotect,
} from './index';

const kindsOf = (text: string) => findProtectedSpans(text).map((s) => [s.kind, s.text]);

/** Simulates a rule that deletes every Thai character outside placeholders. */
const stripThai = (masked: string) => masked.replace(/[\u0E00-\u0E7F]/g, '');

describe('protect: detection', () => {
  it('protects fenced code blocks with ``` and ~~~', () => {
    const text = 'ดูโค้ดนี้ครับ\n```ts\nconst x = "ครับ";\n```\nแล้วก็ ~~~\n~~~py\nprint(1)\n~~~';
    expect(kindsOf(text)).toEqual([
      ['code-block', '```ts\nconst x = "ครับ";\n```'],
      ['code-block', '~~~py\nprint(1)\n~~~'],
    ]);
  });

  it('protects an empty code block and an unclosed one to the end', () => {
    expect(kindsOf('```\n```')).toEqual([['code-block', '```\n```']]);
    expect(kindsOf('ก่อน\n```js\nlet a = 1 // ครับ')).toEqual([
      ['code-block', '```js\nlet a = 1 // ครับ'],
    ]);
  });

  it('protects inline code, including double-backtick spans', () => {
    expect(kindsOf('ใช้ `npm i` นะครับ และ ``a`b`` ด้วย')).toEqual([
      ['inline-code', '`npm i`'],
      ['inline-code', '``a`b``'],
    ]);
  });

  it('protects URLs (with Thai paths) and trims sentence punctuation', () => {
    expect(kindsOf('อ่านที่ https://th.wikipedia.org/wiki/ภาษาไทย. แล้วสรุปครับ')).toEqual([
      ['url', 'https://th.wikipedia.org/wiki/ภาษาไทย'],
    ]);
    expect(kindsOf('(ดู www.example.com/a?b=1)')).toEqual([['url', 'www.example.com/a?b=1']]);
    expect(kindsOf('https://en.wikipedia.org/wiki/Foo_(bar)!')).toEqual([
      ['url', 'https://en.wikipedia.org/wiki/Foo_(bar)'],
    ]);
  });

  it('protects e-mail addresses', () => {
    expect(kindsOf('ส่งไปที่ somchai@example.com ครับ')).toEqual([
      ['email', 'somchai@example.com'],
    ]);
  });

  it('protects straight, curly, single-curly, guillemet and corner quotes', () => {
    expect(kindsOf('"ครับ" “ค่ะ” ‘นะคะ’ «จ้า» 「ครับผม」')).toEqual([
      ['quote', '"ครับ"'],
      ['quote', '“ค่ะ”'],
      ['quote', '‘นะคะ’'],
      ['quote', '«จ้า»'],
      ['quote', '「ครับผม」'],
    ]);
  });

  it('leaves unbalanced quotes alone and does not span lines', () => {
    expect(kindsOf('เขาพูดว่า "สวัสดีครับ\nแล้วก็ไป')).toEqual([]);
  });

  it('protects numbers: Arabic, Thai digits, decimals, separators, signs, percent, times, dates', () => {
    expect(kindsOf('ราคา 1,299.50 บาท ลด 15 % เหลือ ๑๒๓ ชิ้น -4 องศา 10:30 น. 23/09/2026')).toEqual(
      [
        ['number', '1,299.50'],
        ['number', '15 %'],
        ['number', '๑๒๓'],
        ['number', '-4'],
        ['number', '10:30'],
        ['number', '23/09/2026'],
      ],
    );
  });

  it('resolves overlaps: a number inside code or a URL stays part of the outer span', () => {
    expect(kindsOf('`x = 42` https://a.com/42 "ปี 2026"')).toEqual([
      ['inline-code', '`x = 42`'],
      ['url', 'https://a.com/42'],
      ['quote', '"ปี 2026"'],
    ]);
  });

  it('finds nothing in plain Thai text', () => {
    expect(kindsOf('สวัสดีครับ ช่วยสรุปให้หน่อยนะคะ')).toEqual([]);
  });
});

describe('protect/unprotect round trip', () => {
  const samples = [
    '',
    'สวัสดีครับ',
    'ช่วยแก้ `const a = 1` ให้หน่อยครับ ดู https://example.com/x?y=1 ด้วยนะคะ',
    '```python\nprint("ครับ")\n```\nอธิบายโค้ดนี้หน่อยค่ะ ราคา ๑,๒๐๐ บาท',
    'พูดว่า “ขอบคุณครับ” แล้วส่งเมลไป malee@example.com ภายใน 3 วัน',
  ];

  it.each(samples)('restores byte-identical text: %j', (text) => {
    const { masked, spans } = protect(text);
    expect(unprotect(masked, spans)).toBe(text);
  });

  it('keeps protected spans byte-identical even when a rule strips all Thai around them', () => {
    const text = 'ครับ `ครับ` ครับ "ค่ะ" 100 https://x.th/ครับ';
    const { masked, spans } = protect(text);
    const restored = unprotect(stripThai(masked), spans);
    expect(restored).toBe(' `ครับ`  "ค่ะ" 100 https://x.th/ครับ');
  });

  it('masks with 3-character private-use placeholders', () => {
    const { masked, spans } = protect('a `b` c');
    expect(spans).toHaveLength(1);
    expect(masked).toMatch(new RegExp(`^a ${SENTINEL_OPEN}.${SENTINEL_CLOSE} c$`));
    expect(isPlaceholderChar(masked[2])).toBe(true);
    expect(isPlaceholderChar('a')).toBe(false);
    expect(isPlaceholderChar(undefined)).toBe(false);
  });
});

describe('protect: integrity failures throw instead of corrupting text', () => {
  it('refuses input that already contains private-use characters', () => {
    expect(() => protect('hello \uE123')).toThrow(ProtectError);
  });

  it('throws when a placeholder is lost', () => {
    const { masked, spans } = protect('ก `x` ข `y`');
    const broken = masked.slice(0, masked.lastIndexOf(SENTINEL_OPEN));
    expect(() => unprotect(broken, spans)).toThrow(/lost/);
  });

  it('throws when placeholders are reordered', () => {
    const { masked, spans } = protect('`x` `y`');
    const [a, b] = masked.split(' ');
    expect(() => unprotect(`${b} ${a}`, spans)).toThrow(/out of order/);
  });

  it('throws when a placeholder is duplicated', () => {
    const { masked, spans } = protect('`x`');
    expect(() => unprotect(masked + masked, spans)).toThrow(/out of order/);
  });

  it('throws when a placeholder refers to an unknown span', () => {
    const { masked } = protect('`x`');
    expect(() => unprotect(masked, [])).toThrow(/Unknown/);
  });

  it('throws when a placeholder is partially damaged', () => {
    const { masked, spans } = protect('`x`');
    expect(() => unprotect(masked + SENTINEL_CLOSE, spans)).toThrow(/damaged/);
  });

  it('throws when there are too many spans to encode', () => {
    const text = Array.from({ length: MAX_SPANS + 1 }, (_, i) => String(i)).join(' ');
    expect(() => protect(text)).toThrow(/Too many/);
  });

  it('ProtectError has a recognisable name', () => {
    expect(new ProtectError('x').name).toBe('ProtectError');
  });
});
