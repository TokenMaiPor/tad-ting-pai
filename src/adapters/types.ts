// One adapter per chat site. An adapter only knows where things are on the page; reading and
// writing the chat box goes through the shared helpers below, so every site behaves the same.
import type { SiteId } from '../core/storage';

export interface SiteAdapter {
  id: SiteId;
  label: string;
  /** Hostnames this adapter handles. */
  hosts: string[];
  /** The element the user types into (contenteditable div or textarea), or null if not rendered yet. */
  findInput(doc: Document): HTMLElement | null;
  /** The element our toolbar is inserted after (usually the composer's outer container). */
  findMountAnchor(input: HTMLElement): HTMLElement | null;
}

export function adapterForHost(adapters: SiteAdapter[], hostname: string): SiteAdapter | undefined {
  return adapters.find((a) => a.hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`)));
}

/** First element matching any selector, skipping hidden duplicates. */
export function queryFirstVisible(doc: Document, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const el of Array.from(doc.querySelectorAll<HTMLElement>(selector))) {
      if (el.isConnected && el.getClientRects().length > 0) return el;
    }
  }
  return null;
}

/** Walk up to the first ancestor matching any selector (in order of preference). */
export function closestOf(el: HTMLElement, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const found = el.closest<HTMLElement>(selector);
    if (found) return found;
  }
  return null;
}

// ---------- Reading and writing the chat box ----------

export function getInputText(input: HTMLElement): string {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) return input.value;
  // innerText keeps the line breaks the user sees in rich editors (ProseMirror, Quill).
  return (input.innerText ?? input.textContent ?? '').replace(/\u00A0/g, ' ').replace(/\n+$/, '');
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Replace the whole chat box content in a way the site's editor notices, so its internal
 * state (and send button) stays in sync. Never submits anything.
 *
 * Strategy, most to least native:
 *  1. textarea: native value setter + `input` event (works with React-controlled inputs)
 *  2. contenteditable: select all + execCommand('insertText'), which editors treat as typing
 *  3. contenteditable: synthetic paste event carrying the text (ProseMirror/Quill handle paste)
 */
export function setInputText(input: HTMLElement, text: string): boolean {
  input.focus();

  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value === text;
  }

  selectAll(input);
  let ok: boolean;
  try {
    // Deprecated but still the only way to "type" into rich editors while keeping undo history.
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (ok && normalize(getInputText(input)) === normalize(text)) return true;

  selectAll(input);
  const data = new DataTransfer();
  data.setData('text/plain', text);
  input.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );
  return normalize(getInputText(input)) === normalize(text);
}

function selectAll(el: HTMLElement) {
  const selection = el.ownerDocument.getSelection();
  if (!selection) return;
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}
