import type { LanguagePack } from '../types';
import { thaiRules } from './rules';

const thai: LanguagePack = {
  code: 'th',
  name: { en: 'Thai', native: 'ไทย' },
  // Thai consonants, vowels, tone marks and digits (U+0E01–U+0E5B).
  script: /[ก-๛]/,
  // Leading vowels (เ แ โ ใ ไ) and ห (never a final consonant) always attach to what follows;
  // vowel signs, the repetition mark and tone marks can never begin a syllable.
  syllableBreak: {
    notAfter: /[\u0E40-\u0E44\u0E2B]/,
    notAt: /[\u0E30-\u0E3A\u0E45-\u0E4E]/,
  },
  replyHint: 'Reply in Thai.',
  rules: thaiRules,
};

export default thai;
