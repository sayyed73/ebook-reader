/**
 * Security policy for the book frame. See docs/SECURITY.md for the reasoning behind each rule.
 */

/**
 * iframe sandbox flags. Scripts only: no same-origin (the book gets an opaque origin and
 * cannot reach the app, its storage or cookies), no forms, popups, top navigation,
 * downloads or modal dialogs. Never add `allow-same-origin` here.
 */
export const BOOK_FRAME_SANDBOX = 'allow-scripts';

/**
 * CSP of the frame page. Inline and eval'd scripts are allowed because interactive books are
 * built from them; isolation comes from the sandbox and from having no network or bridge
 * beyond the validated storage protocol. Everything that could load or send data is closed.
 */
export const BOOK_FRAME_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval'",
  "style-src 'unsafe-inline' data:",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** Extra policy written into the book in safe mode. Policies only ever get stricter. */
export const SAFE_MODE_CSP = "script-src 'none'";
