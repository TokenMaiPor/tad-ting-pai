// Keyboard shortcut plumbing: the manifest command fires in the background worker, which
// forwards it to the chat tab's content script. The shortcut only opens the preview; the
// user still confirms before anything in the chat box changes.

/** Manifest command name. Users can rebind it at chrome://extensions/shortcuts. */
export const COMPRESS_COMMAND = 'compress-message';
// Must not clash with Chrome's own shortcuts, or Chrome silently leaves the command unbound.
// On Windows/Linux Chrome already uses Shift+Alt+T (focus toolbar), +I, +A and +N.
export const COMPRESS_SHORTCUT = 'Alt+Shift+K';

export const COMPRESS_MESSAGE = 'ttp:compress';

export interface CompressRequest {
  type: typeof COMPRESS_MESSAGE;
}

export function isCompressRequest(message: unknown): message is CompressRequest {
  return (
    !!message &&
    typeof message === 'object' &&
    (message as { type?: unknown }).type === COMPRESS_MESSAGE
  );
}
