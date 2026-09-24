import type { LanguagePack } from '../types';
import { indonesianRules } from './rules';

const indonesian: LanguagePack = {
  code: 'id',
  name: { en: 'Indonesian', native: 'Bahasa Indonesia' },
  // Plain Latin letters, shared with English, so the pack is only picked when common
  // Indonesian words appear too (see `markers`).
  script: /[a-zA-Z]/,
  markers: {
    words: [
      'yang',
      'dan',
      'saya',
      'aku',
      'ini',
      'itu',
      'tidak',
      'untuk',
      'dengan',
      'apa',
      'bagaimana',
      'bisa',
      'tolong',
      'kamu',
      'anda',
      'terima',
      'kasih',
      'dari',
      'adalah',
      'akan',
      'juga',
      'sudah',
      'belum',
      'mau',
      'ingin',
      'buatkan',
      'jelaskan',
      'dong',
      'sih',
      'makasih',
      'bisakah',
      'apakah',
      'gimana',
      'kenapa',
      'mengapa',
      'tentang',
      'dalam',
    ],
    min: 2,
  },
  wordSpacing: true,
  replyHint: 'Reply in Indonesian.',
  rules: indonesianRules,
};

export default indonesian;
