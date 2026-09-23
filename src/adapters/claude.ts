import { closestOf, queryFirstVisible, type SiteAdapter } from './types';

// claude.ai — ProseMirror contenteditable inside a <fieldset> composer.
export const claudeAdapter: SiteAdapter = {
  id: 'claude',
  label: 'Claude',
  hosts: ['claude.ai'],
  findInput: (doc) =>
    queryFirstVisible(doc, [
      'fieldset div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"].ProseMirror',
      'div.ProseMirror[contenteditable="true"]',
    ]),
  findMountAnchor: (input) => closestOf(input, ['fieldset', 'form']) ?? input.parentElement,
};
