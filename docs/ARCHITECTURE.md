# Architecture

## Stack

- **Tauri 2**: one native shell for Windows, macOS, Linux, iOS and Android. Rust only where native is required.
- **React + TypeScript + Vite**: UI.
- **Vitest + Testing Library** (unit), **Playwright** (browser/security), **ESLint + Prettier**.

## Layers

Dependencies point **inward only**: `ui → app → core ← platform`, and `frame → core`.
ESLint enforces these boundaries (`eslint.config.js`).

```text
src/
  core/        Pure TypeScript domain logic and the ports (interfaces) it needs.
    library/   Book model, file validation, LibraryService, ports.ts (FilePicker, repositories)
    reader/    Frame security policy, frame protocol, BookStorageSession, ReaderService
  frame/       Bootstrap that runs inside the sandboxed book frame (bundled into frame.html)
  platform/    Platform = the ports bundled per runtime.
    web/       Browser adapter: file input, IndexedDB. Used for dev and automated tests.
    tauri/     Native adapter: commands for file storage and the native picker, bookframe URL.
  config/      User-facing product identity (the only place the app name lives).
  app/         Composition root: picks the platform, builds services, provides them to the UI.
  ui/          React. components/ = generic building blocks; features/ = library, reader.
  styles/      Design tokens and global CSS.
vite-plugins/  Builds frame.html (CSP + inlined bootstrap) for dev and production.
src-tauri/     Rust shell: capabilities, library commands (file storage), native picker,
               bookframe protocol serving the embedded frame page.
e2e/           Playwright tests, test books and hostile fixtures.
```

Rules:

- `core` is framework-free and unit-tested; it's where new features' logic goes first.
- UI talks to services, never to IndexedDB/Tauri directly.
- Each platform difference lives behind a port. Adding a platform = adding an adapter.
- Expected failures cross boundaries as typed values (`Result`), not thrown strings.
- No brand names in identifiers or CSS classes (`main-container`, not `readora-container`).

## Opening a book

```text
Library ──open(bookId)──▶ ReaderScreen
  1. ReaderService.open: book metadata + HTML + saved localStorage entries
  2. <iframe sandbox="allow-scripts" src="/frame.html">        (own page, own strict CSP)
  3. frame ──"ready"──▶ app  (window message, sender checked)
  4. app ──{ html, storage, position } + private MessagePort──▶ frame
  5. bootstrap installs localStorage/sessionStorage stand-ins, then document.write(book)
  6. book writes localStorage → stand-in → port → app validates → BookStorageSession
     → batched save (250 ms, and on close / app hidden)
  7. reader scrolls → throttled "position" → LibraryService.savePosition (batched);
     the saved position is sent with the next load and restored after the book's load event
  8. book reloads itself → new "ready" → app resends book with latest data and a new port
     book navigates away → "unloading" with no "ready" after 2 s → "Reload book" screen
```

Messages are versioned (`frame-protocol.ts`) so frame and app can evolve independently.
Security rationale for each step: [SECURITY.md](SECURITY.md).

## Native storage (Tauri)

```text
<app data>/library/books/<id>/meta.json     metadata (schema owned by the TypeScript core)
                             /content.html  the book
                             /storage.json  its saved localStorage entries
```

Ids are validated (`[A-Za-z0-9-]`, max 64), writes are atomic (temp file + rename), sizes are
capped. The browser build stores the same data in IndexedDB.

## Library rules

- Adding a file identical to a library book (same SHA-256) opens that book.
- A different file with the same file name or title asks: **Replace** (keeps id, saved data,
  position) or **Keep both**.
- Metadata updates are serialized read-modify-write by id, so e.g. a position save and a
  "last opened" update can't overwrite each other.
- Delete removes metadata, HTML and saved data.

## Extension points (planned)

- New formats (PDF, images) = new reader feature + a `DocumentKind`; the library stays the same.
- "Open with" / file associations = platform adapter capability.
- Backup/export = a use case over the two repositories.
