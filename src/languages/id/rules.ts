// Indonesian compression rules, as data. Same safety model as the Thai pack (see
// src/languages/th/rules.ts), plus: Indonesian puts spaces between words, so the pack sets
// `wordSpacing` and clause edges are punctuation, line breaks and the text edges only.
// Phrases are written in lower case and matched case-insensitively.
// When a phrase can plausibly carry meaning in some sentence, it does NOT belong here. That is
// why "ya" (also "yes": "jawab ya atau tidak") and "mohon" (also "to beg") are not removed.
import type { CompressionRule } from '../types';

/** A phrase plus the same phrase followed by common punctuation ("halo", "halo,", …). */
function withPunctuation(phrases: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const phrase of phrases) {
    for (const mark of ['', ',', '.', '!']) out[phrase + mark] = '';
  }
  return out;
}

export const indonesianRules: CompressionRule[] = [
  {
    id: 'id.greetings',
    label: { en: 'Removed greeting', native: 'Hapus salam' },
    description:
      'A greeting that forms a whole clause ("Halo kak,") tells the AI nothing about the task.',
    position: 'standalone',
    replacements: withPunctuation([
      'halo kak',
      'hai kak',
      'halo',
      'hai',
      'selamat pagi',
      'selamat siang',
      'selamat sore',
      'selamat malam',
    ]),
    examples: [
      { input: 'Halo kak, tolong jelaskan apa itu API', output: 'tolong jelaskan apa itu API' },
      {
        input: 'Selamat pagi! Buatkan ringkasan artikel ini',
        output: 'Buatkan ringkasan artikel ini',
      },
    ],
    keep: ['Apa arti selamat pagi dalam bahasa Jepang?', 'Tulis ucapan halo untuk tim'],
  },
  {
    id: 'id.request-openers',
    label: { en: 'Removed request opener', native: 'Hapus pembuka permintaan' },
    description:
      'Polite openers ("Tolong", "Bisakah kamu") only soften the request. Removed only when the request itself follows in the same clause, so a lone "Tolong!" (Help!) stays.',
    position: 'clause-head',
    replacements: {
      'boleh minta tolong': '',
      'apakah kamu bisa': '',
      'apakah anda bisa': '',
      'bisakah kamu': '',
      'bisakah anda': '',
      'minta tolong': '',
      'bisa tolong': '',
      tolong: '',
    },
    examples: [
      { input: 'Tolong buatkan email untuk klien', output: 'buatkan email untuk klien' },
      {
        input: 'Bisakah kamu menjelaskan cara kerja DNS?',
        output: 'menjelaskan cara kerja DNS?',
      },
      {
        input: 'Minta tolong terjemahkan ini ke bahasa Inggris',
        output: 'terjemahkan ini ke bahasa Inggris',
      },
    ],
    keep: ['Tolong!', 'Dia berteriak tolong dengan keras', 'Apa arti kata tolong?'],
  },
  {
    id: 'id.particles',
    label: { en: 'Removed casual particles', native: 'Hapus partikel santai' },
    description:
      'Sentence-final particles "dong", "sih", "deh" carry tone, not meaning. Only removed at the end of a clause that has other words.',
    position: 'clause-tail',
    replacements: { dong: '', sih: '', deh: '' },
    examples: [
      { input: 'Jelaskan lebih singkat dong', output: 'Jelaskan lebih singkat' },
      { input: 'Kodenya error kenapa sih?', output: 'Kodenya error kenapa?' },
      { input: 'Coba lagi deh.', output: 'Coba lagi.' },
    ],
    keep: ['Sih.', 'Dong Nai adalah provinsi di Vietnam'],
  },
  {
    id: 'id.thanks',
    label: { en: 'Removed thanks', native: 'Hapus ucapan terima kasih' },
    description:
      'A thank-you that forms a whole clause adds tokens but no instruction. Thanks inside a sentence ("terima kasih atas …") stays.',
    position: 'standalone',
    replacements: withPunctuation([
      'terima kasih banyak',
      'terima kasih ya',
      'terima kasih',
      'makasih banyak',
      'makasih ya',
      'makasih',
    ]),
    examples: [
      { input: 'Ringkas teks ini. Terima kasih banyak!', output: 'Ringkas teks ini.' },
      { input: 'Makasih, sekarang buat versi pendeknya', output: 'sekarang buat versi pendeknya' },
    ],
    keep: ['Terima kasih atas bantuannya kemarin', 'Tulis surat terima kasih'],
  },
];
