import type { SiteAdapter } from './types';

// claude.ai — ProseMirror contenteditable inside a <fieldset> composer.
export const claudeAdapter: SiteAdapter = {
  id: 'claude',
  label: 'Claude',
  hosts: ['claude.ai'],
  inputSelectors: [
    'fieldset div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"].ProseMirror',
    'div.ProseMirror[contenteditable="true"]',
  ],
  anchorSelectors: ['fieldset', 'form'],
};
