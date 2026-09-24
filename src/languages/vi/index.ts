import type { LanguagePack } from '../types';
import { vietnameseRules } from './rules';

const vietnamese: LanguagePack = {
  code: 'vi',
  name: { en: 'Vietnamese', native: 'Tiếng Việt' },
  // Letters only Vietnamese uses among Latin-script languages: ă đ ơ ư and the tone-marked
  // vowels with a dot below or a hook above. â ê ô and plain acute/grave accents are left out
  // because French, Portuguese and others use them too. Text is expected in NFC, which is
  // what browsers and common Vietnamese keyboards produce.
  script:
    /[ăđơưĂĐƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]/,
  wordSpacing: true,
  replyHint: 'Reply in Vietnamese.',
  rules: vietnameseRules,
};

export default vietnamese;
