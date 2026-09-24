// Vietnamese compression rules, as data. Same safety model as the Thai pack (see
// src/languages/th/rules.ts), plus: Vietnamese puts spaces between words, so the pack sets
// `wordSpacing` and clause edges are punctuation, line breaks and the text edges only.
// Phrases are written in lower case and matched case-insensitively.
// When a phrase can plausibly carry meaning in some sentence, it does NOT belong here.
import type { CompressionRule } from '../types';

/** A phrase plus the same phrase followed by common punctuation ("xin chào", "xin chào,", …). */
function withPunctuation(phrases: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const phrase of phrases) {
    for (const mark of ['', ',', '.', '!']) out[phrase + mark] = '';
  }
  return out;
}

export const vietnameseRules: CompressionRule[] = [
  {
    id: 'vi.greetings',
    label: { en: 'Removed greeting', native: 'Bỏ lời chào' },
    description:
      'A greeting that forms a whole clause ("Xin chào,") tells the AI nothing about the task.',
    position: 'standalone',
    replacements: withPunctuation([
      'xin chào bạn',
      'xin chào',
      'chào bạn',
      'chào anh',
      'chào chị',
      'chào em',
      'hello bạn',
    ]),
    examples: [
      { input: 'Xin chào, hãy tóm tắt bài viết này', output: 'hãy tóm tắt bài viết này' },
      { input: 'Chào bạn! Giải thích giúp mình về API', output: 'Giải thích giúp mình về API' },
    ],
    keep: ['Viết một câu chào bạn bè bằng tiếng Anh', 'Xin chào có nghĩa là gì?'],
  },
  {
    id: 'vi.request-openers',
    label: { en: 'Removed request opener', native: 'Bỏ lời mở đầu yêu cầu' },
    description:
      'Polite openers ("Làm ơn", "Cho mình hỏi") only soften the request. Removed only when the request itself follows in the same clause.',
    position: 'clause-head',
    replacements: {
      'bạn có thể giúp mình': '',
      'bạn có thể giúp tôi': '',
      'bạn có thể giúp em': '',
      'cho mình hỏi': '',
      'cho tôi hỏi': '',
      'cho em hỏi': '',
      'xin hỏi': '',
      'làm ơn': '',
      'vui lòng': '',
    },
    examples: [
      { input: 'Làm ơn dịch câu này sang tiếng Anh', output: 'dịch câu này sang tiếng Anh' },
      { input: 'Cho mình hỏi Python là gì?', output: 'Python là gì?' },
      {
        input: 'Bạn có thể giúp tôi viết email xin nghỉ phép không?',
        output: 'viết email xin nghỉ phép không?',
      },
    ],
    keep: ['Bạn có thể bay không?', 'Làm ơn!', 'Anh ấy nói làm ơn giúp tôi'],
  },
  {
    id: 'vi.polite-particles',
    label: { en: 'Removed polite particles', native: 'Bỏ tiểu từ lịch sự' },
    description:
      'Sentence-final particles "ạ", "nhé", "nha" carry tone, not meaning. Only removed at the end of a clause that has other words.',
    position: 'clause-tail',
    replacements: { ạ: '', nhé: '', nha: '', nhen: '' },
    examples: [
      { input: 'Viết ngắn gọn nhé.', output: 'Viết ngắn gọn.' },
      { input: 'Giải thích giúp em ạ', output: 'Giải thích giúp em' },
      {
        input: 'Tóm tắt bài này nha, dùng gạch đầu dòng',
        output: 'Tóm tắt bài này, dùng gạch đầu dòng',
      },
    ],
    keep: ['Nha Trang có gì đẹp?', 'Dạ.', 'nhanh lên'],
  },
  {
    id: 'vi.thanks',
    label: { en: 'Removed thanks', native: 'Bỏ lời cảm ơn' },
    description:
      'A thank-you that forms a whole clause adds tokens but no instruction. Thanks inside a sentence ("cảm ơn bạn đã …") stays.',
    position: 'standalone',
    replacements: withPunctuation([
      'cảm ơn bạn nhiều',
      'cảm ơn bạn rất nhiều',
      'cảm ơn nhiều',
      'cảm ơn bạn',
      'cảm ơn',
      'cám ơn bạn',
      'cám ơn',
    ]),
    examples: [
      { input: 'Dịch đoạn này. Cảm ơn bạn!', output: 'Dịch đoạn này.' },
      { input: 'Cảm ơn nhiều, giờ viết lại ngắn hơn', output: 'giờ viết lại ngắn hơn' },
    ],
    keep: ['Cảm ơn bạn đã giúp tôi hôm qua', 'Viết thư cảm ơn khách hàng'],
  },
];
