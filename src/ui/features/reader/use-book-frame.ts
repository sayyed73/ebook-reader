import { useEffect, useRef, type RefObject } from 'react';
import type { BookStorageSession } from '@/core/reader/book-storage-session';
import { parseFrameMessage, toEnvelope, type LoadBookMessage } from '@/core/reader/frame-protocol';

/** How long a page may take to come back after unloading before we treat it as navigated away. */
const RELOAD_GRACE_MS = 2000;

export type FrameEvent = 'link-blocked' | 'storage-full' | 'left-page';

interface UseBookFrameOptions {
  readonly html: string;
  readonly storage: BookStorageSession;
  readonly safeMode: boolean;
  readonly onEvent: (event: FrameEvent) => void;
}

/**
 * Host side of the frame protocol (see frame-protocol.ts). Answers the frame's `ready` with
 * the book and a private port, then applies the book's storage changes from that port.
 */
export function useBookFrame({
  html,
  storage,
  safeMode,
  onEvent,
}: UseBookFrameOptions): RefObject<HTMLIFrameElement | null> {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let port: MessagePort | null = null;
    let leftPageTimer: ReturnType<typeof setTimeout> | undefined;

    const handlePortMessage = (event: MessageEvent) => {
      const message = parseFrameMessage(event.data);
      if (!message) return;
      switch (message.type) {
        case 'ready':
          return; // Only valid on the window channel.
        case 'unloading':
          void storage.flush();
          clearTimeout(leftPageTimer);
          leftPageTimer = setTimeout(() => {
            onEventRef.current('left-page');
          }, RELOAD_GRACE_MS);
          return;
        case 'navigation-blocked':
          onEventRef.current('link-blocked');
          return;
        default:
          if (!storage.apply(message)) onEventRef.current('storage-full');
      }
    };

    const handleWindowMessage = (event: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      if (parseFrameMessage(event.data)?.type !== 'ready') return;

      // First load, or the book reloaded itself: give the new page the book, its latest data
      // and a fresh port. The previous page's port is closed.
      clearTimeout(leftPageTimer);
      port?.close();
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = handlePortMessage;
      const load: LoadBookMessage = { type: 'load', html, storage: storage.snapshot(), safeMode };
      frameWindow.postMessage(toEnvelope(load), '*', [channel.port2]);
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      clearTimeout(leftPageTimer);
      port?.close();
    };
  }, [html, storage, safeMode]);

  return iframeRef;
}
