# Readora

A free, private reader for **interactive HTML books**: single `.html` files with scripts,
toggles and saved progress, which normal PDF/ebook apps on phones can't open properly.
Runs on Windows, macOS and iPhone (Android/Linux later). No account, no network, no tracking.

> Status: **Release 1, Phase 3 (library) done.** Add `.html` books and read them with their
> scripts running in a sandbox; progress and reading position persist. Re-adding a book offers
> to replace it (keeping progress); books can be deleted. Phase 4 brings the native apps.
> See [docs/PLAN.md](docs/PLAN.md).

## Docs

- [Plan](docs/PLAN.md): releases, phases, scope
- [Architecture](docs/ARCHITECTURE.md): layers, data flow, extension points
- [Security](docs/SECURITY.md): how untrusted books are isolated
- [Security test results](docs/SECURITY_TESTS.md)

## Run it

### In a browser (quickest)

Needs [Node.js 22+](https://nodejs.org).

```sh
npm install
npm run dev        # open http://localhost:5173
```

### As a desktop app (Tauri)

One-time setup, per the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):

- **Both:** Node.js 22+ and Rust (install via [rustup](https://rustup.rs)).
- **Windows:** "Microsoft C++ Build Tools" (Desktop development with C++). WebView2 is already on Windows 10/11.
- **macOS:** Xcode Command Line Tools: `xcode-select --install`.

```sh
npm install
npm run tauri dev      # opens the desktop app with live reload
npm run tauri build    # produces an installer in src-tauri/target/release/bundle/
```

The first `tauri dev` compiles the Rust side and takes a few minutes; later runs are fast.

> Until Phase 4, books run with scripts only in `tauri dev`. In a `tauri build` installer the
> book frame needs the native frame protocol that Phase 4 adds.

iPhone instructions come in Phase 4.

## Checks

```sh
npm run check      # typecheck + lint + format check + unit tests
npm run test:e2e   # browser + security tests (first time: npx playwright install chromium)
npm run build      # production web build
cd src-tauri && cargo clippy && cargo test
```

CI runs the same on every pull request (`.github/workflows/ci.yml`).
