// Thai compression rules, as data. Rules run in this order, and earlier rules can expose
// matches for later ones (e.g. removing "ครับ" from "สวัสดีครับ" leaves a bare greeting).
//
// Safety model, applied by the engine to every rule:
//   1. A match must start and end on an Intl.Segmenter word boundary ("คะ" ≠ "คะแนน").
//   2. It must also satisfy the rule's `position` (clause-start / clause-end / …).
//   3. Code, URLs, e-mails, numbers and quoted text are masked before any rule runs.
// When a phrase can plausibly carry meaning in some sentence, it does NOT belong here.
import type { CompressionRule } from '../types';

export const thaiRules: CompressionRule[] = [
  {
    id: 'th.polite-particles',
    label: { en: 'Removed polite particles', native: 'ตัดคำลงท้ายสุภาพ' },
    description:
      'Polite sentence-final particles (ครับ, ค่ะ, นะคะ …) carry tone, not meaning, and cost several tokens each. Only removed at the end of a clause.',
    position: 'clause-end',
    replacements: {
      นะคะ: '',
      นะค่ะ: '',
      นะครับ: '',
      ครับผม: '',
      เจ้าค่ะ: '',
      ครับ: '',
      คร้าบ: '',
      ค้าบ: '',
      ค่ะ: '',
      คะ: '',
      จ้ะ: '',
      จ้า: '',
      จ๊ะ: '',
      ฮะ: '',
    },
    examples: [
      { input: 'ช่วยสรุปบทความนี้ให้หน่อยนะคะ', output: 'ช่วยสรุปบทความนี้ให้หน่อย' },
      { input: 'ขอบคุณครับ ช่วยอธิบายเพิ่มได้ไหมคะ', output: 'ขอบคุณ ช่วยอธิบายเพิ่มได้ไหม' },
      { input: 'ได้ครับผม', output: 'ได้' },
      { input: 'ทำอย่างไรคะ?', output: 'ทำอย่างไร?' },
      { input: 'ตอบสั้นๆ นะครับ', output: 'ตอบสั้นๆ' },
    ],
    keep: ['คะแนนสอบของฉันคือเท่าไร', 'ครับผมชื่อวิชัย', 'คำว่า "ครับ" แปลว่าอะไร', 'ไปกับเจ้า'],
  },
  {
    id: 'th.casual-particles',
    label: { en: 'Removed casual particles', native: 'ตัดคำลงท้ายภาษาพูด' },
    description:
      'Casual sentence-final particles (อ่ะ, อะ, เนอะ) add no meaning. "อะ" inside "อะไร" is safe because it is not a word boundary.',
    position: 'clause-end',
    replacements: { อ่ะ: '', อะ: '', เนอะ: '' },
    examples: [
      { input: 'อันนี้คืออะไรอ่ะ', output: 'อันนี้คืออะไร' },
      { input: 'ทำยังไงดีอะ ช่วยหน่อย', output: 'ทำยังไงดี ช่วยหน่อย' },
      { input: 'ช่วยหน่อยอะ', output: 'ช่วยหน่อย' },
      { input: 'แก้บั๊กนี้ยังไงอ่ะ', output: 'แก้บั๊กนี้ยังไง' },
    ],
    keep: ['อะไรคือ API', 'อะลูมิเนียมหนักเท่าไร'],
  },
  {
    id: 'th.greetings',
    label: { en: 'Removed greeting', native: 'ตัดคำทักทาย' },
    description:
      'A greeting that stands alone as its own clause. Kept when it is part of a question (e.g. about the word itself).',
    position: 'standalone',
    replacements: { สวัสดี: '', หวัดดี: '', ฮัลโหล: '' },
    examples: [
      { input: 'สวัสดี ช่วยสรุปข่าวนี้', output: 'ช่วยสรุปข่าวนี้' },
      { input: 'หวัดดี\nแปลประโยคนี้', output: 'แปลประโยคนี้' },
    ],
    keep: ['คำว่าสวัสดีมาจากไหน', 'สวัสดีปีใหม่ภาษาอังกฤษพูดว่าอะไร'],
  },
  {
    id: 'th.request-openers',
    label: { en: 'Shortened request opener', native: 'ตัดคำขอร้องตอนต้น' },
    description:
      'Openers such as "ฉันอยากให้คุณช่วย" or "รบกวนช่วย" before a verb: the imperative alone means the same to an AI. Only at the start of a clause.',
    position: 'clause-start',
    replacements: {
      ฉันอยากให้คุณช่วย: '',
      ผมอยากให้คุณช่วย: '',
      หนูอยากให้คุณช่วย: '',
      อยากให้คุณช่วย: '',
      ขอรบกวนช่วย: '',
      รบกวนช่วย: '',
      กรุณาช่วย: '',
      ช่วยกรุณา: '',
      กรุณา: '',
    },
    requireLetterAfter: true,
    examples: [
      { input: 'ฉันอยากให้คุณช่วยเขียนอีเมลลาป่วย', output: 'เขียนอีเมลลาป่วย' },
      { input: 'รบกวนช่วยแปลย่อหน้านี้', output: 'แปลย่อหน้านี้' },
      { input: 'กรุณาตอบสั้นๆ', output: 'ตอบสั้นๆ' },
    ],
    keep: ['เสียงรบกวนดังมาก', 'รบกวนเวลาสักครู่', 'เขาอยากให้คุณช่วยงาน'],
  },
  {
    id: 'th.request-closers',
    label: { en: 'Shortened request ending', native: 'ตัดคำขอร้องท้ายประโยค' },
    description:
      'Endings such as "ให้หน่อยได้ไหม" turn a command into a polite question. The AI does the same thing either way. Only at the end of a clause.',
    position: 'clause-end',
    replacements: {
      ให้หน่อยได้ไหม: '',
      ให้หน่อยได้มั้ย: '',
      หน่อยได้ไหม: '',
      หน่อยได้มั้ย: '',
      ให้หน่อยนะ: '',
      ให้หน่อย: '',
    },
    examples: [
      { input: 'ช่วยสรุปบทความนี้ให้หน่อยได้ไหม', output: 'ช่วยสรุปบทความนี้' },
      { input: 'แปลเป็นภาษาอังกฤษให้หน่อย', output: 'แปลเป็นภาษาอังกฤษ' },
    ],
    keep: ['ให้หน่อยเดียวพอ', 'ใส่น้ำตาลหน่อย'],
  },
  {
    id: 'th.filler-openers',
    label: { en: 'Removed filler words', native: 'ตัดคำฟุ่มเฟือย' },
    description: 'Spoken fillers such as "แบบว่า" or "คือว่า" at the start of a clause.',
    position: 'clause-start',
    replacements: { คือแบบว่า: '', ก็คือว่า: '', ประมาณว่า: '', แบบว่า: '', คือว่า: '' },
    examples: [
      { input: 'แบบว่าอยากรู้วิธีทำขนมปัง', output: 'อยากรู้วิธีทำขนมปัง' },
      { input: 'คือว่าโค้ดมันรันไม่ผ่าน', output: 'โค้ดมันรันไม่ผ่าน' },
    ],
    keep: ['เขียนแบบว่าไม่มีใครเข้าใจ'],
  },
  {
    id: 'th.thanks',
    label: { en: 'Removed thanks', native: 'ตัดคำขอบคุณ' },
    description:
      'A thank-you or apology that stands alone as its own clause. The AI does not need it to answer.',
    position: 'standalone',
    replacements: {
      ขอบคุณล่วงหน้า: '',
      ขอบคุณมากๆ: '',
      ขอบคุณมาก: '',
      ขอบคุณ: '',
      ขอบใจ: '',
      ขอโทษที่รบกวน: '',
    },
    examples: [
      {
        input: 'ช่วยตรวจคำผิดในย่อหน้านี้\nขอบคุณล่วงหน้า',
        output: 'ช่วยตรวจคำผิดในย่อหน้านี้',
      },
      { input: 'ขอบคุณมาก ช่วยอธิบายต่อ', output: 'ช่วยอธิบายต่อ' },
    ],
    keep: ['ขอบคุณภาษาญี่ปุ่นพูดว่าอะไร', 'เขียนการ์ดขอบคุณลูกค้า'],
  },
  {
    id: 'th.tham-kan',
    label: { en: 'Removed "ทำการ"', native: 'ตัด "ทำการ"' },
    description:
      '"ทำการ" + verb is formal padding ("ทำการวิเคราะห์" = "วิเคราะห์"). Only at the start of a clause and before a Thai word, so "เวลาทำการ" (business hours) is kept.',
    position: 'clause-start',
    replacements: { ทำการ: '' },
    requireLetterAfter: true,
    examples: [{ input: 'ทำการวิเคราะห์ข้อมูลยอดขาย', output: 'วิเคราะห์ข้อมูลยอดขาย' }],
    keep: ['เวลาทำการของธนาคาร', 'เปิดทำการ 9 โมง', 'วันทำการ'],
  },
  {
    id: 'th.wordy-phrases',
    label: { en: 'Shortened wordy phrases', native: 'ย่อวลีเยิ่นเย้อ' },
    description: 'Longer phrasings with an exact shorter equivalent.',
    position: 'anywhere',
    replacements: {
      ในเรื่องของ: 'เรื่อง',
      เกี่ยวกับเรื่อง: 'เกี่ยวกับ',
      เป็นอย่างไรบ้าง: 'เป็นอย่างไร',
      สามารถที่จะ: 'สามารถ',
      ค่อนข้างที่จะ: 'ค่อนข้าง',
      มีความจำเป็นต้อง: 'จำเป็นต้อง',
      อยากจะ: 'อยาก',
    },
    examples: [
      { input: 'ช่วยอธิบายในเรื่องของภาษีเงินได้', output: 'ช่วยอธิบายเรื่องภาษีเงินได้' },
      { input: 'ฉันอยากจะเรียนเขียนโปรแกรม', output: 'ฉันอยากเรียนเขียนโปรแกรม' },
      { input: 'โปรเจกต์นี้เป็นอย่างไรบ้าง', output: 'โปรเจกต์นี้เป็นอย่างไร' },
      { input: 'เขาสามารถที่จะทำได้', output: 'เขาสามารถทำได้' },
    ],
    keep: ['คำว่า "อยากจะ" ใช้ยังไง', 'จะอยากได้อะไร'],
  },
];
