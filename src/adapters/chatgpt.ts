import { closestOf, queryFirstVisible, type SiteAdapter } from './types';

// chatgpt.com — ProseMirror editor with id "prompt-textarea" inside the composer <form>.
// Older builds used a real <textarea>, kept as a fallback.
export const chatgptAdapter: SiteAdapter = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: ['chatgpt.com', 'chat.openai.com'],
  findInput: (doc) =>
    queryFirstVisible(doc, [
      '#prompt-textarea[contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'textarea#prompt-textarea',
      'form textarea',
    ]),
  findMountAnchor: (input) =>
    closestOf(input, ['form[data-type="unified-composer"]', 'form']) ?? input.parentElement,
};
