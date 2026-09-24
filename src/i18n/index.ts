// UI strings for the extension's own interface (toolbar, preview panel, popup).
// chrome.i18n cannot switch language at runtime, so we keep a small dictionary instead.

export type UiLang = 'th' | 'en';

const en = {
  'toolbar.count': '≈ {n} tokens',
  'toolbar.counting': '≈ … tokens',
  'toolbar.estimate': 'estimate',
  'toolbar.estimateTitle':
    'Estimated with the GPT-4o tokenizer (o200k_base). Claude and Gemini count differently, so treat this as a guide.',
  'toolbar.compress': 'Compress',
  'toolbar.translate': 'Translate to English',
  'toolbar.translating': 'Translating…',
  'toolbar.downloading': 'Downloading translator {p}%',
  'toolbar.region': 'TadTingPai',
  'toolbar.fallback': 'TadTingPai · Compress',
  'toolbar.fallbackTitle':
    'The toolbar could not find its usual spot on this page, so it is shown here instead.',

  'status.empty': 'Type a message first.',
  'status.nothingToCompress': 'Nothing to compress in this message.',
  'status.aborted': 'Skipped: this message contains text we could not protect safely.',
  'status.applied': 'Replaced. Review it, then send it yourself.',
  'status.translateFailed': 'Translation failed. Your text was not changed.',
  'status.translateUnavailable': 'On-device translation is not available in this browser.',
  'status.inputNotFound': 'Could not find the chat box on this page.',
  'status.writeFailed':
    'Could not update the chat box. Copy the new text from the preview instead.',
  'status.stale': 'The message changed while the preview was open. Press the button again.',

  'panel.titleCompress': 'Compressed version',
  'panel.titleTranslate': 'English translation',
  'panel.before': 'Before',
  'panel.after': 'After',
  'panel.tokens': '{n} tokens',
  'panel.saved': '−{n} tokens',
  'panel.more': '+{n} tokens',
  'panel.same': 'same token count',
  'panel.counting': 'counting…',
  'panel.uncounted': 'not counted',
  'panel.apply': 'Use this text',
  'panel.cancel': 'Keep original',
  'panel.close': 'Close',
  'panel.copy': 'Copy',
  'panel.copied': 'Copied',
  'panel.estimateNote':
    'Token counts are estimates. Nothing is sent until you press send yourself.',
  'panel.changes': 'Changes',
  'panel.numbersWarning':
    'Some numbers in the original do not appear in the translation. Check them before sending.',

  'popup.saved': 'tokens saved so far',
  'popup.savedNote': 'Estimated. Counted only when you choose "Use this text".',
  'popup.uses': 'Used {n} times',
  'popup.week': 'Tokens saved, last 7 days',
  'popup.settings': 'Settings',
  'popup.sites': 'Show the toolbar on',
  'popup.siteStatus': 'Toolbar status',
  'popup.status.ok': 'toolbar OK',
  'popup.status.fallback': 'fallback button',
  'popup.status.notFound': 'no chat box on the last page',
  'popup.report': 'Report a broken site',
  'popup.rules': 'Compression rules ({on}/{total} on)',
  'popup.removed': '(removed)',
  'popup.replyHint': 'After translating, ask the AI to reply in my language',
  'popup.language': 'Interface language',
  'popup.reset': 'Reset counter',
  'popup.resetConfirm': 'Press again to reset',
  'popup.privacy': 'Runs on your device. No data leaves your browser.',
} as const;

export type MessageKey = keyof typeof en;

const th: Record<MessageKey, string> = {
  'toolbar.count': '≈ {n} โทเคน',
  'toolbar.counting': '≈ … โทเคน',
  'toolbar.estimate': 'ค่าประมาณ',
  'toolbar.estimateTitle':
    'ประมาณด้วยตัวนับของ GPT-4o (o200k_base) ส่วน Claude และ Gemini นับต่างกันเล็กน้อย ใช้เป็นแนวทางเท่านั้น',
  'toolbar.compress': 'บีบข้อความ',
  'toolbar.translate': 'แปลเป็นอังกฤษ',
  'toolbar.translating': 'กำลังแปล…',
  'toolbar.downloading': 'กำลังโหลดตัวแปล {p}%',
  'toolbar.region': 'TadTingPai',
  'toolbar.fallback': 'TadTingPai · บีบข้อความ',
  'toolbar.fallbackTitle': 'หาตำแหน่งปกติของแถบเครื่องมือในหน้านี้ไม่เจอ เลยแสดงปุ่มไว้ตรงนี้แทน',

  'status.empty': 'พิมพ์ข้อความก่อนนะครับ',
  'status.nothingToCompress': 'ข้อความนี้ไม่มีส่วนที่ตัดได้',
  'status.aborted': 'ข้ามการบีบ เพราะมีข้อความที่ปกป้องได้ไม่ปลอดภัย',
  'status.applied': 'แทนที่แล้ว ตรวจดูแล้วกดส่งเองได้เลย',
  'status.translateFailed': 'แปลไม่สำเร็จ ข้อความของคุณยังเหมือนเดิม',
  'status.translateUnavailable': 'เบราว์เซอร์นี้ยังไม่รองรับการแปลในเครื่อง',
  'status.inputNotFound': 'ไม่พบช่องพิมพ์แชทในหน้านี้',
  'status.writeFailed': 'ใส่ข้อความลงช่องแชทไม่ได้ คัดลอกข้อความใหม่จากหน้าตัวอย่างแทนได้',
  'status.stale': 'ข้อความเปลี่ยนระหว่างเปิดหน้าตัวอย่าง กดปุ่มอีกครั้งนะครับ',

  'panel.titleCompress': 'ฉบับบีบแล้ว',
  'panel.titleTranslate': 'คำแปลภาษาอังกฤษ',
  'panel.before': 'ก่อน',
  'panel.after': 'หลัง',
  'panel.tokens': '{n} โทเคน',
  'panel.saved': '−{n} โทเคน',
  'panel.more': '+{n} โทเคน',
  'panel.same': 'จำนวนโทเคนเท่าเดิม',
  'panel.counting': 'กำลังนับ…',
  'panel.uncounted': 'นับไม่ได้',
  'panel.apply': 'ใช้ข้อความนี้',
  'panel.cancel': 'ใช้ข้อความเดิม',
  'panel.close': 'ปิด',
  'panel.copy': 'คัดลอก',
  'panel.copied': 'คัดลอกแล้ว',
  'panel.estimateNote': 'จำนวนโทเคนเป็นค่าประมาณ ระบบจะไม่ส่งข้อความจนกว่าคุณจะกดส่งเอง',
  'panel.changes': 'สิ่งที่เปลี่ยน',
  'panel.numbersWarning': 'ตัวเลขบางตัวในต้นฉบับไม่อยู่ในคำแปล ตรวจก่อนส่งนะครับ',

  'popup.saved': 'โทเคนที่ประหยัดได้',
  'popup.savedNote': 'ค่าประมาณ นับเฉพาะตอนกด "ใช้ข้อความนี้"',
  'popup.uses': 'ใช้ไปแล้ว {n} ครั้ง',
  'popup.week': 'โทเคนที่ประหยัดได้ 7 วันล่าสุด',
  'popup.settings': 'ตั้งค่า',
  'popup.sites': 'แสดงแถบเครื่องมือบน',
  'popup.siteStatus': 'สถานะแถบเครื่องมือ',
  'popup.status.ok': 'แถบเครื่องมือปกติ',
  'popup.status.fallback': 'ใช้ปุ่มลอยแทน',
  'popup.status.notFound': 'หน้าล่าสุดไม่มีช่องแชท',
  'popup.report': 'แจ้งว่าเว็บเปลี่ยน',
  'popup.rules': 'กฎการบีบข้อความ (เปิด {on}/{total})',
  'popup.removed': '(ตัดออก)',
  'popup.replyHint': 'หลังแปล ขอให้ AI ตอบกลับเป็นภาษาของฉัน',
  'popup.language': 'ภาษาของหน้าจอ',
  'popup.reset': 'รีเซ็ตตัวนับ',
  'popup.resetConfirm': 'กดอีกครั้งเพื่อรีเซ็ต',
  'popup.privacy': 'ทำงานในเครื่องคุณเท่านั้น ไม่มีข้อมูลออกจากเบราว์เซอร์',
};

const dictionaries: Record<UiLang, Record<MessageKey, string>> = { en, th };

export function formatNumber(n: number, lang: UiLang): string {
  return new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US').format(n);
}

export function t(lang: UiLang, key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[lang][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? formatNumber(value, lang) : value;
  });
}

export function defaultUiLang(browserLanguage: string | undefined): UiLang {
  return browserLanguage?.toLowerCase().startsWith('th') ? 'th' : 'en';
}
