# Architecture

## Stack

- **Tauri 2**: one native shell for Windows, macOS, Linux, iOS and Android. Rust only where native is required.
- **React + TypeScript + Vite**: UI.
- **Vitest + Testing Library** (unit), **Playwright** (browser/security), **ESLint + Prettier**.

## Layers

Dependencies point **inward only**: `ui → app → core ← platform`.

```text
src/
  core/        Pure TypeScript domain logic. No React, no DOM globals, no Tauri.
               Book model, library use cases, book document builder, bridge protocol.
  platform/    The Platform interface (ports the app needs) + one adapter per runtime.
    platform.ts  Platform: grows FilePicker, BookRepository, BookDataRepository, ... per phase
    web/       Browser adapter (file input, IndexedDB). Used for dev and automated tests.
    tauri/     Native adapter (Phase 4): dialog plugin, app-data storage, frame protocol.
  config/      User-facing product identity (the only place the app name lives).
  app/         Composition root: picks the platform adapter, wires services, provides them to UI.
  ui/          React. components/ = generic building blocks; features/ = screens (library, reader).
  styles/      Design tokens and global CSS.
src-tauri/     Rust shell: window, capabilities, narrow commands, frame protocol.
```

Rules:

- `core` is framework-free and unit-tested; it's where new features' logic goes first.
- UI talks to services, never to `localStorage`/IndexedDB/Tauri directly.
- Each platform difference lives behind a port. Adding a platform = adding an adapter.
- Errors cross boundaries as typed values (`Result`), not thrown strings.
- No brand names in identifiers or CSS classes (`main-container`, not `readora-container`).

## Opening a book (Release 1)

```text
Library ──open(bookId)──▶ ReaderScreen
  1. BookRepository.getContent(bookId)            → book HTML (stored at import)
  2. BookDataRepository.load(bookId)              → saved localStorage entries
  3. <iframe sandbox="allow-scripts" src=frameUrl> (separate origin, strict CSP)
  4. frame → app: "ready";  app → frame: { html, storage seed, safeMode }
  5. frame bootstrap installs the localStorage shim, then writes the book into its document
  6. book writes localStorage → shim → postMessage → app validates → BookDataRepository.save
```

The bootstrap and protocol are versioned so the frame and app can evolve independently.
Security rationale for each step: [SECURITY.md](SECURITY.md).

## Extension points (planned)

- New formats (PDF, images) = new reader feature + a `DocumentKind`; the library stays the same.
- "Open with" / file associations = platform adapter capability.
- Backup/export = a use case over the two repositories.
