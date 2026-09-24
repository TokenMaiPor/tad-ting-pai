# Chrome Web Store listing: TadTingPai

Everything needed to fill in the Chrome Web Store developer dashboard, in the order the
dashboard asks for it. Upload file: `npm run zip` → `.output/tad-ting-pai-<version>-chrome.zip`.

> Publishing needs the maintainer's own developer account (one-time US$5 registration fee).
> Nobody else can do this step.

---

## Store listing tab

**Name:** TadTingPai

**Summary** (max 132 characters, currently 117):

> Use fewer tokens on ChatGPT, Claude and Gemini when you write in Thai, Vietnamese or Indonesian. Runs on your device.

**Category:** Productivity → Tools
**Language:** English (add Thai as a second listing language with the text below)

### Description (English)

```
AI chat services count your messages in tokens, and most tokenizers are built around English.
The same request written in Thai often costs two to three times as many tokens as in English,
and polite openers, particles and thank-yous add more on top. That fills your context window
faster and gets you rate-limited sooner.

TadTingPai adds a thin strip under the chat box on ChatGPT, Claude and Gemini:

• Live token estimate: see roughly what your message costs before you send it.
• Compress: removes polite particles, greetings, "could you please…" openers and thank-yous that
  the AI doesn't need. Thai, Vietnamese and Indonesian rules included.
• Translate to English: uses Chrome's built-in on-device translator, then asks the AI to reply in
  your language. The button only appears when your Chrome supports it.
• Preview first: every change is shown before and after, with the token difference. Nothing
  changes in the chat box until you press "Use this text", and TadTingPai never sends anything.
• Your rules: switch any compression rule off in the popup.
• Keyboard shortcut: Alt+Shift+K opens the preview (change it at chrome://extensions/shortcuts).
• Savings history: tokens saved in the last 7 days, stored on your device only.

Safe by design
• Code blocks, inline code, links, e-mail addresses, numbers and quoted text are never changed.
• No servers, no accounts, no analytics. The extension makes no network requests at all, and
  CI checks the build for this on every change.
• Only one permission: storage, for your settings and savings counter.

Open source (MIT): https://github.com/TokenMaiPor/tad-ting-pai
Token counts are estimates made with the GPT-4o tokenizer (o200k_base). Claude and Gemini
count a little differently.

TadTingPai is an independent open-source project, not affiliated with OpenAI, Anthropic or Google.
```

### Description (Thai)

```
บริการแชท AI คิดค่าใช้จ่ายและจำกัดการใช้งานเป็น "โทเคน" และตัวนับโทเคนส่วนใหญ่ออกแบบมาสำหรับภาษาอังกฤษ
ข้อความเดียวกันที่เขียนเป็นภาษาไทยจึงมักใช้โทเคนมากกว่า 2–3 เท่า ทำให้เต็มโควตาเร็วและโดนจำกัดการใช้งานเร็วขึ้น

TadTingPai (ตัดทิ้งไป) เพิ่มแถบบางๆ ใต้ช่องแชทบน ChatGPT, Claude และ Gemini

• นับโทเคนแบบสด: เห็นว่าข้อความนี้ใช้โทเคนประมาณเท่าไรก่อนกดส่ง
• บีบข้อความ: ตัดคำลงท้ายสุภาพ คำทักทาย "รบกวนช่วย…" และคำขอบคุณที่ AI ไม่จำเป็นต้องอ่าน
  รองรับไทย เวียดนาม และอินโดนีเซีย
• แปลเป็นอังกฤษ: ใช้ตัวแปลในเครื่องที่มากับ Chrome แล้วขอให้ AI ตอบกลับเป็นภาษาของคุณ
  (ปุ่มจะแสดงเมื่อ Chrome ของคุณรองรับเท่านั้น)
• ดูตัวอย่างก่อนเสมอ: เห็นข้อความก่อนและหลังพร้อมจำนวนโทเคนที่ลดลง ช่องแชทจะไม่เปลี่ยนจนกว่าคุณจะกด
  "ใช้ข้อความนี้" และ TadTingPai ไม่ส่งข้อความแทนคุณเด็ดขาด
• เลือกกฎเองได้: ปิดกฎที่ไม่ต้องการได้ทีละข้อใน popup
• คีย์ลัด: Alt+Shift+K เปิดหน้าตัวอย่าง (เปลี่ยนได้ที่ chrome://extensions/shortcuts)
• สถิติการประหยัด: โทเคนที่ประหยัดได้ 7 วันล่าสุด เก็บในเครื่องคุณเท่านั้น

ปลอดภัยตั้งแต่การออกแบบ
• โค้ด ลิงก์ อีเมล ตัวเลข และข้อความในเครื่องหมายคำพูด จะไม่ถูกแก้ไข
• ไม่มีเซิร์ฟเวอร์ ไม่ต้องสมัครสมาชิก ไม่เก็บสถิติการใช้งาน ส่วนขยายไม่เชื่อมต่อเครือข่ายเลย และมีการตรวจอัตโนมัติทุกครั้งที่แก้โค้ด
• ขอสิทธิ์เดียวคือ storage สำหรับเก็บการตั้งค่าและตัวนับโทเคนที่ประหยัดได้

โอเพนซอร์ส (MIT): https://github.com/TokenMaiPor/tad-ting-pai
จำนวนโทเคนเป็นค่าประมาณจากตัวนับของ GPT-4o (o200k_base) ส่วน Claude และ Gemini นับต่างกันเล็กน้อย

TadTingPai เป็นโปรเจกต์โอเพนซอร์สอิสระ ไม่มีส่วนเกี่ยวข้องกับ OpenAI, Anthropic หรือ Google
```

### Graphics

| Asset                             | File                                            | Size     |
| --------------------------------- | ----------------------------------------------- | -------- |
| Store icon                        | `public/icon/128.png`                           | 128×128  |
| Screenshot 1: live token estimate | `docs/store/screenshots/1-toolbar.png`          | 1280×800 |
| Screenshot 2: compress preview    | `docs/store/screenshots/2-compress-preview.png` | 1280×800 |
| Screenshot 3: Vietnamese          | `docs/store/screenshots/3-vietnamese.png`       | 1280×800 |
| Screenshot 4: popup savings       | `docs/store/screenshots/4-popup.png`            | 1280×800 |
| Screenshot 5: rule toggles        | `docs/store/screenshots/5-rules.png`            | 1280×800 |

Regenerate the screenshots after UI changes: `npm run build && node scripts/store-screenshots.mjs`.
They are taken on local fixture pages, not on the real sites, and show no third-party branding.

---

## Privacy practices tab

**Single purpose:**

> Help people who write to AI chat services in Thai, Vietnamese or Indonesian use fewer tokens,
> by estimating a message's token count and offering a shorter version the user can preview and
> accept before sending.

**Permission justification**

| Permission                                                              | Why                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                                               | Saves the user's settings (sites, rules, interface language) and the local savings counter in `chrome.storage.local`. Nothing is synced or sent anywhere.                             |
| Host access: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com | The content script adds the toolbar under the chat box on these sites and, only after the user clicks "Use this text", replaces the text in the chat box. It never submits a message. |
| Remote code                                                             | No. All code ships in the package.                                                                                                                                                    |

**Data usage.** Check **none** of the data types (personally identifiable information, health,
financial, authentication, personal communications, location, web history, user activity,
website content). The extension reads the text in the chat box only on the user's device, to
count and compress it. That text is never stored, logged or transmitted.

Then tick all three certifications:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://github.com/TokenMaiPor/tad-ting-pai/blob/main/docs/store/privacy.md`

---

## Distribution tab

- Visibility: Public
- Regions: All regions
- Pricing: Free

## Before you press "Submit for review"

1. `npm run lint && npm test && npm run build && node scripts/audit-network.mjs` all pass
2. `npm run zip` and upload the zip from `.output/`
3. Load the zip unpacked once and try it while logged in to all three sites. The e2e tests only
   use fixture pages, so this is the only check against the live sites.
