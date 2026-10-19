# Security

Books are **untrusted code**. Anyone can publish an HTML book, so opening one must not be able
to harm the user, even with scripts on.

## What a book must never be able to do

1. Touch the app itself: its UI, its storage, other books or their data.
2. Reach native capabilities: the file system, Tauri commands/IPC, the shell, the clipboard, camera/mic.
3. Use the network: load remote scripts/images/fonts, send data out (fetch, beacons, sockets, images, forms).
4. Leave the reader: navigate the app or the frame to a website, open popups, start downloads.
5. Permanently break the app: a frozen or crashing book must be recoverable.

What a book **can** do: run its own scripts, render its own UI, and read/write **its own** storage.

## Defenses (layered)

| #   | Layer                                                                                                                                                                                                                                                                                                          | Blocks                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | **Sandboxed iframe**: `sandbox="allow-scripts"` only. Never `allow-same-origin`, `allow-forms`, `allow-popups`, `allow-top-navigation`, `allow-downloads`, `allow-modals`. The book runs with an _opaque origin_.                                                                                              | 1, 4 (popups, top navigation, forms, downloads, dialogs) |
| 2   | **Separate frame origin**: the book is loaded into a tiny trusted bootstrap page (`frame.html`) served from its own origin with its own strict CSP, never into the app's DOM and never as the main window URL.                                                                                                 | 1, 2                                                     |
| 3   | **Frame CSP**: `default-src 'none'`; inline/eval scripts allowed (books need them); styles, images, fonts and media only from inline / `data:` / `blob:`; `connect-src`, `frame-src`, `worker-src`, `form-action`, `base-uri` all `'none'`.                                                                    | 3                                                        |
| 4   | **App CSP**: strict policy for the trusted UI, and `frame-src` limited to the frame origin, so the book's frame can't be navigated to a website.                                                                                                                                                               | 1, 4                                                     |
| 5   | **Narrow storage bridge**: the only channel from book to app is `postMessage` with a tiny, versioned schema (`storage set/remove/clear`, `scroll position`). The app accepts messages only from the current book's frame window, validates shape and sizes, and binds them to that book. Per-book quota: 5 MB. | 1                                                        |
| 6   | **No native bridge in the frame**: no Tauri APIs are exposed to book content; app capabilities are minimal and there is no generic "read any file" command.                                                                                                                                                    | 2                                                        |
| 7   | **Recovery**: the app records "book opening"; if the app froze or crashed, next launch offers to reopen that book in **safe mode** (scripts off). Safe mode is also a per-book toggle.                                                                                                                         | 5                                                        |
| 8   | **Input limits**: max book size (initially 20 MB), validated type/encoding.                                                                                                                                                                                                                                    | 5                                                        |

## Known residual risks (documented, not hidden)

- **CPU/memory abuse**: an iframe usually shares the app's renderer process; an infinite loop can
  freeze the app until it's restarted. Mitigated by layer 7, not prevented.
- **WebRTC**: CSP doesn't govern WebRTC, so a malicious script could, in theory, send _its own_
  data (book content, what you typed into that book) to a STUN/TURN server. It still can't read
  other books, the app, or your files. Per-platform WebView mitigations are evaluated in Phase 4.
- **DNS prefetch** hints may leak a hostname lookup on some engines.
- **WebView engine bugs** are outside our control; keep OS/WebView updated.
- Remote fonts/images in books don't load (by design), so some books look slightly different.

## Test fixtures (Phase 2, automated where possible)

Each fixture is a small HTML book that _attempts_ an attack and reports the outcome:
parent/app access · storage/cookies/IndexedDB · Tauri globals · fetch/XHR/beacon/WebSocket/EventSource ·
remote img/css/script/font/iframe · navigation (links, `location`, meta refresh, forms, `window.open`) ·
downloads · weaker injected CSP / `<base>` · storage quota overflow · forged bridge messages.
Results are recorded per platform in `docs/SECURITY_TESTS.md` (Phase 2 for browser, Phase 4 for native).
