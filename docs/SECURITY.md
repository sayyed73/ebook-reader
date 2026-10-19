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

Numbers in brackets refer to the list above.

1. **Sandboxed iframe** [1, 4]: `sandbox="allow-scripts"` only. Never `allow-same-origin`,
   `allow-forms`, `allow-popups`, `allow-top-navigation`, `allow-downloads` or `allow-modals`.
   The book runs with an _opaque origin_: no access to the app, its storage, cookies or IndexedDB.
2. **Separate frame page** [1, 2]: the book is written into a tiny trusted page (`frame.html`,
   built from `src/frame/`) with its own CSP. It is never put into the app's DOM and never loaded
   as the main window. (A `srcdoc` iframe would inherit the app's CSP, which would either break
   books or force a weaker app CSP.) In the native app the page is embedded in the binary and
   served only by the `bookframe` protocol (`src-tauri/src/book_frame.rs`), on its own origin,
   with the CSP repeated as a header plus `sandbox allow-scripts`. It is deliberately not served
   through Tauri's asset protocol, which would inject the app's CSP into it.
3. **Frame CSP** [3] (`src/core/reader/frame-policy.ts`): `default-src 'none'`; inline/eval
   scripts allowed because books are built from them; styles, images, fonts and media only inline
   or `data:`/`blob:`; `connect-src`, `frame-src`, `worker-src`, `form-action`, `base-uri` all
   `'none'`. A book's own CSP or `<base>` can only make things stricter.
4. **App CSP** [1, 4]: strict policy for the trusted UI, with `frame-src` limited to the app/frame
   origin, so the book's frame can't be navigated to a website.
5. **Narrow bridge** [1] (`src/core/reader/frame-protocol.ts`): on start the frame says `ready`; the
   app answers with the book and a private `MessagePort`. After that the only messages accepted are
   `storage set/remove/clear`, "link blocked" and "page unloading", over that port, validated for
   shape and size, applied to that book only. Per-book quota: 5 MB, enforced in the frame _and_
   the app. (Window messages can't be used: after a page unloads their sender is `null` and can't be
   verified, which would drop a book's last save before it reloads itself.)
6. **No native bridge** [2]: no Tauri APIs are exposed to book content. The app's own commands
   (`src-tauri/src/library`, `picker.rs`) take no file paths: the library addresses books by
   validated ids inside its own data folder, and picking a file happens in the native dialog and
   is read in Rust. Every command needs an explicit permission in `capabilities/`; no plugin
   (fs, dialog) permissions are granted to the UI at all.
   On WebKit (macOS, iOS, Linux) the native IPC message handler is visible to subframes too; Tauri
   drops any message without the per-launch 128-bit invoke key, which is injected into the main
   frame only, so the book frame can't use it. This is verified by a forged-call test.
7. **Recovery** [5]: if a book navigates away, the app shows "Reload book" instead of an error
   page. Safe mode (scripts off, via an extra `script-src 'none'` policy) is a per-book toggle.
   If the app froze, crashed or was force-quit while a book was open, the next launch offers to
   open that book in safe mode (`src/core/reader/recovery.ts`).
8. **Input limits** [5]: `.html`/`.htm`, max 20 MB, not binary, decoded via BOM/`<meta charset>`.

The frame's link guard (suppressing clicks on external links) is a usability feature, **not** a
security boundary: links it can't see (e.g. a detached `<a>` clicked by script) are still stopped
by layer 4 and handled by layer 7.

## Known residual risks (documented, not hidden)

- **CPU/memory abuse**: an iframe usually shares the app's renderer process; an infinite loop can
  freeze the app until it's restarted. Mitigated by safe mode and Phase 4 recovery, not prevented.
- **WebRTC**: CSP doesn't govern WebRTC, so a malicious script could, in theory, send _its own_
  data (book content, what you typed into that book) to a STUN/TURN server. It still can't read
  other books, the app, or your files. Per-platform WebView mitigations are evaluated in Phase 4.
- **DNS prefetch** hints may leak a hostname lookup on some engines.
- **WebView engine bugs** are outside our control; keep OS/WebView updated.
- **IPC handler exposure on WebKit**: as above, protection relies on the secrecy of Tauri's invoke
  key, which never leaves the main frame.
- **Compatibility trade-offs** (by design): remote fonts/images don't load; `alert`/`confirm`/
  `prompt`, cookies, IndexedDB, downloads and popups don't work inside books; `sessionStorage`
  works but isn't saved.

## Tests

Hostile books in `e2e/fixtures/hostile/` attempt each attack; `e2e/security.spec.ts` runs them
and fails if anything leaks or any request leaves the app. Results per platform:
[SECURITY_TESTS.md](SECURITY_TESTS.md).
