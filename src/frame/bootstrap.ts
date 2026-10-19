/**
 * Runs inside the sandboxed book frame (frame.html) before any book code. It receives the
 * book from the app, installs the storage stand-ins, and writes the book into the document.
 *
 * Everything here must be done before the book's own scripts run: once the book is written,
 * this code shares the frame with untrusted scripts and must not be relied on to stay intact.
 * The real security boundaries are the sandbox and CSP, not this file.
 */
import {
  parseLoadBookMessage,
  toEnvelope,
  type FrameMessage,
  type LoadBookMessage,
} from '@/core/reader/frame-protocol';
import { installLinkGuard } from './link-guard';
import { restoreReadingPosition, trackReadingPosition } from './reading-position';
import { createStorage } from './storage-shim';

function announceReady(): void {
  // The frame has an opaque origin and can't name the host's origin, hence '*'. Nothing but
  // this signal is sent on the window channel.
  window.parent.postMessage(toEnvelope({ type: 'ready' }), '*');
}

function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(window, name, { value, configurable: true, writable: false });
}

function loadBook(message: LoadBookMessage, port: MessagePort): void {
  const postToHost = (frameMessage: FrameMessage) => {
    port.postMessage(toEnvelope(frameMessage));
  };
  defineGlobal('localStorage', createStorage(message.storage, postToHost));
  defineGlobal(
    'sessionStorage',
    createStorage({}, () => undefined),
  );

  document.open();
  // document.open() erases all window listeners, so these are added after it.
  installLinkGuard(window, () => {
    postToHost({ type: 'navigation-blocked' });
  });
  trackReadingPosition(window, ({ scrollY }) => {
    postToHost({ type: 'position', scrollY });
  });
  window.addEventListener('pagehide', () => {
    postToHost({ type: 'unloading' });
  });
  restoreReadingPosition(window, message.position);
  // document.write is deliberate: it parses the book as a full document in this frame,
  // keeping its doctype (standards mode) and running its scripts in order.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.write(message.html);
  document.close();
}

function onMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const message = parseLoadBookMessage(event.data);
  const [port] = event.ports;
  if (!message || !port) return;
  window.removeEventListener('message', onMessage);
  loadBook(message, port);
}

window.addEventListener('message', onMessage);
announceReady();
