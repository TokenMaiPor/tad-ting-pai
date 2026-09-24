import type { SiteAdapter } from './types';

// gemini.google.com — Quill editor (.ql-editor) inside the <rich-textarea> custom element.
export const geminiAdapter: SiteAdapter = {
  id: 'gemini',
  label: 'Gemini',
  hosts: ['gemini.google.com'],
  inputSelectors: [
    'rich-textarea .ql-editor[contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  anchorSelectors: ['input-area-v2', '.input-area-container', 'input-container', 'rich-textarea'],
};
