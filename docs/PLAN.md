# Readora — Plan

> Working name. The brand appears only in user-facing strings and app config, never in code identifiers.

## Goal

A free, local-only reader for **interactive HTML books**: single `.html` files that use JavaScript,
CSS toggles and `localStorage` to track progress (see a typical example: a guide with chapter
check-offs, a daily log and notes). Mobile PDF/ebook apps can't run these; this app can, safely.

- No account, no server, no network, no telemetry.
- Book scripts run **on by default**, inside a sandbox (see [SECURITY.md](SECURITY.md)).
- Each book's saved data (its `localStorage`) persists between sessions.

## Targets

| Platform                 | Release 1                       | How it's tested during development                            |
| ------------------------ | ------------------------------- | ------------------------------------------------------------- |
| Browser (dev harness)    | ✅                              | `npm run dev`, automated Playwright tests                     |
| Windows, macOS (Tauri 2) | ✅                              | `npm run tauri dev` on your machine                           |
| iPhone (Tauri 2)         | ✅                              | iOS Simulator, or your iPhone over cable with a free Apple ID |
| Android, Linux           | builds expected, not a priority | —                                                             |

## Release 1 — Interactive HTML books

| Phase                 | Scope                                                                                                                                                                                               | Where     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **1. Foundation** ✅  | Project scaffold (Vite + React + TS, Tauri 2 shell), architecture skeleton, lint/format/test, CI, docs. App boots to an empty library.                                                              | cloud     |
| **2. Reader core** ✅ | Import one `.html` file → sandboxed reader. Storage bridge so books' `localStorage` works and persists. Hostile test fixtures + automated security tests.                                           | cloud     |
| **3. Library** ✅     | Library list (import, open, delete, last opened), duplicate/replace handling (keeps progress), resume reading position, error states, light/dark UI.                                                | cloud     |
| **4a. Native** ✅     | Tauri adapters (native picker, app-data storage, isolated book-frame protocol), hang recovery (offer to remove a book that froze the app), Linux native security check in CI, device testing guide. | cloud     |
| **4b. Devices**       | Run on Windows, macOS, iPhone with [TESTING_ON_DEVICES.md](TESTING_ON_DEVICES.md); fix what comes up; standalone iPhone install.                                                                    | **local** |

Release 1 is done when the example book works fully (chapters, check-offs, tracker, notes,
progress survives restart) on Windows, macOS and iPhone, and the security tests pass on each.

## Release 2 — More formats (scope to be confirmed)

- PDF viewer (PDF.js) and image viewer.
- "Open in Readora" from Files / other apps; file associations on desktop.
- Book export/downloads (e.g. a book's "Export as .txt") routed through the system share/save sheet.
- Backup/restore of library and book data.
- Maybe: multi-file HTML books (ZIP bundles of HTML/CSS/JS/images).

## Out of scope

Editing/authoring, cloud sync, accounts, a general web browser, app-store publishing (for now).
