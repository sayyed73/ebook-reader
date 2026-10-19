# Security test results

- **Browser** (automated, every PR): `npm run test:e2e` (`e2e/security.spec.ts`, fixtures in
  `e2e/fixtures/hostile/`). Every request that would leave the app is intercepted and recorded;
  any recorded request fails the test.
- **Desktop app on Linux** (automated, every PR): `e2e/native/check-tauri-linux.mjs` drives the
  production Tauri build through WebKitGTK's WebDriver: bookframe origin, no Tauri globals in the
  frame, hostile probes, forged IPC calls from the frame, path-traversal ids, file storage,
  navigation containment.
- **Windows, macOS, iPhone**: manual checklist in [TESTING_ON_DEVICES.md](TESTING_ON_DEVICES.md).

## Coverage

| Attack                                                                                          | Fixture                                | Expected                                 |
| ----------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| Read/modify app DOM, location, opener                                                           | escape-attempts                        | blocked (opaque origin)                  |
| Cookies, IndexedDB, Cache Storage                                                               | escape-attempts                        | blocked                                  |
| Tauri globals (`__TAURI__`, `__TAURI_INTERNALS__`, `ipc`)                                       | escape-attempts                        | absent                                   |
| fetch / XHR / beacon / WebSocket / EventSource / dynamic import                                 | escape-attempts                        | blocked, no request                      |
| Remote script, stylesheet, font, image, CSS background, media, iframe, object, prefetch/preload | escape-attempts                        | blocked, no request                      |
| Weaker injected CSP, `<base>` hijack (incl. relative URLs)                                      | escape-attempts                        | no effect                                |
| Workers (blob)                                                                                  | escape-attempts                        | blocked                                  |
| Top navigation, popups, `alert`, form submit, download link                                     | escape-attempts                        | blocked, no dialog/popup/download        |
| Clipboard write                                                                                 | escape-attempts                        | blocked                                  |
| Storage over 5 MB quota                                                                         | escape-attempts                        | `QuotaExceededError` in the book         |
| Navigate frame by script / detached link / meta refresh                                         | navigate-by-script, meta-refresh       | stopped, "Reload book" shown, no request |
| Read another book's saved data                                                                  | navigate-by-script + interactive-guide | not visible                              |

## Results

| Platform                  | Engine                         | Date       | Result      |
| ------------------------- | ------------------------------ | ---------- | ----------- |
| Linux, desktop viewport   | Chromium 141 (Playwright 1.56) | 2026-10-19 | ✅ all pass |
| Linux, Pixel 7 viewport   | Chromium 141 (Playwright 1.56) | 2026-10-19 | ✅ all pass |
| Windows (Tauri, WebView2) | —                              | Phase 4    | not yet run |
| macOS (Tauri, WKWebView)  | —                              | Phase 4    | not yet run |
| iPhone (Tauri, WKWebView) | —                              | Phase 4    | not yet run |
| Android (Tauri, WebView)  | —                              | Phase 4    | not yet run |

A pass on one engine is not assumed for another. WebKitGTK shares WebCore (sandbox, CSP) with
Safari and WKWebView, so it's a strong early signal for macOS/iPhone, but the real WebViews are
still tested in Phase 4.

¹ Books were seeded straight into the library database because WebDriver can't drive the native
file picker; network interception isn't available there, so leaks were judged by the probes.

**Engine difference:** when a book navigates its frame away, Chromium unloads the book first (the
app then offers "Reload book"), while WebKit refuses the navigation and the book simply stays.
Both keep the book inside the reader with no request leaving the app.
