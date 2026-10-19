# Testing on your devices

How to run Readora on Windows, macOS and iPhone during development (no app store needed),
and what to check on each. Start with your desktop; do the iPhone once the desktop works.

> These steps follow the Tauri 2 tooling in this repo. The desktop flow was verified on Linux
> in the dev container; the Windows, macOS and iPhone specifics could not be run there, so if a
> step doesn't match what you see, tell me what happened and I'll adjust it.

## 1. One-time setup (every computer)

1. **Node.js 22+**: install from <https://nodejs.org> (LTS).
2. **Rust**: install from <https://rustup.rs>, then restart the terminal. Check: `rustc --version`.
3. Get the code:

   ```sh
   git clone -b claude/wonderful-albattani-an8i3m https://github.com/sayyed73/ebook-reader
   cd ebook-reader
   npm install
   ```

## 2. Windows

Extra setup: install **Visual Studio Build Tools** and tick **"Desktop development with C++"**.
(WebView2, the engine Readora uses, is already part of Windows 10/11.)

```sh
npm run tauri dev       # opens the app; the first run compiles for a few minutes
```

To make an installer: `npm run tauri build`. The installers are in
`src-tauri\target\release\bundle\` (`msi\` and `nsis\`). Windows SmartScreen will warn because the
app isn't code-signed yet: choose **More info → Run anyway**.

## 3. macOS

Extra setup: `xcode-select --install` (command line tools).

```sh
npm run tauri dev
npm run tauri build     # .app and .dmg in src-tauri/target/release/bundle/
```

The built app isn't notarized yet; open it the first time with **right-click → Open**.

## 4. iPhone (needs your Mac)

### Setup (once)

1. Install **Xcode** from the App Store, open it once and accept the license.
   In **Xcode → Settings → Components**, install an iOS Simulator.
2. Install CocoaPods (used by the iOS tooling): `brew install cocoapods`
   (needs [Homebrew](https://brew.sh)).
3. Add the iOS Rust targets:

   ```sh
   rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
   ```

4. Create the iOS project (once; it's generated into `src-tauri/gen/apple`, commit it):

   ```sh
   npm run tauri ios init
   ```

### Run in the Simulator (easiest first step)

```sh
npm run tauri ios dev       # pick an iPhone simulator when asked
```

To get a book into the simulator: drag the `.html` file onto the simulator window, save it to
**Files**, then use **Add book** in Readora.

### Run on your iPhone (USB cable, free Apple ID)

1. **Xcode → Settings → Accounts → +** and sign in with your Apple ID. A free "Personal Team" is
   created.
2. Find your team ID: in Xcode, open the generated project (`src-tauri/gen/apple/*.xcodeproj`),
   select the app target → **Signing & Capabilities** → Team. Or use the ID shown in your
   Apple Developer account page.
3. Tell Tauri your team, either in `src-tauri/tauri.conf.json`:

   ```json
   "bundle": { "iOS": { "developmentTeam": "YOUR_TEAM_ID" } }
   ```

   or for one terminal session: `export APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID`.

4. Connect the iPhone with a cable, unlock it and tap **Trust This Computer**.
5. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (it restarts).
6. Run, keeping the iPhone and Mac on the **same Wi-Fi** (the app loads its UI from the Mac
   while developing):

   ```sh
   npm run tauri ios dev       # pick your iPhone when asked
   ```

7. The first launch is blocked until you trust yourself as a developer:
   **Settings → General → VPN & Device Management →** your Apple ID **→ Trust**.

Notes:

- With a free Apple ID the app stops opening after **7 days**; run step 6 again to reinstall.
- If Xcode says the bundle identifier is taken, change `identifier` in `tauri.conf.json`
  (e.g. `com.yourname.readora`).
- Getting books onto the phone: **AirDrop** the `.html` file (it lands in Files → Downloads) or
  put it in iCloud Drive, then **Add book** in Readora.
- A standalone install that works without the Mac running comes after this works; we'll set it up
  together.

## 5. Android (optional, emulator)

Install **Android Studio**, then in its SDK Manager install the SDK, **NDK** and command-line
tools, and set `ANDROID_HOME`, `NDK_HOME` and `JAVA_HOME` (Android Studio's bundled JDK). Then:

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
npm run tauri android init
npm run tauri android dev     # starts on a running emulator or connected phone
```

## 6. What to check on each device

Use the test books from `e2e/fixtures/` (copy them to the device like any other book) and your
own sleep guide. Please send me the results (a screenshot or a ✅/❌ per row is enough).

| #   | Check                     | How                                                                                             | Expected                                                                                                   |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Sleep guide works         | Add it; mark a chapter, save a tracker entry, write a note                                      | All work                                                                                                   |
| 2   | Progress survives restart | Quit the app completely, reopen the book                                                        | Everything from #1 still there                                                                             |
| 3   | Reading position          | Scroll down in a long book, go back, reopen                                                     | Same position                                                                                              |
| 4   | Hostile book is contained | Add `hostile/escape-attempts.html`                                                              | The text block shows only `"blocked"` values; app still works                                              |
| 5   | Navigation is contained   | Add `hostile/navigate-by-script.html`, tap **Leave**                                            | Book stays, or "Reload book" is offered                                                                    |
| 6   | Links                     | In `interactive-guide.html` tap "Read more online"                                              | A message; the book stays                                                                                  |
| 7   | Safe mode                 | Toggle **Safe mode** in the reader                                                              | Banner shown; buttons rendered by scripts disappear                                                        |
| 8   | Replace keeps progress    | Add a changed copy of a book with the same file name → Replace                                  | Progress kept                                                                                              |
| 9   | Delete                    | Delete a book from the library                                                                  | Gone; re-adding starts fresh                                                                               |
| 10  | Freeze recovery (desktop) | With a book open, end the app from Task Manager / Activity Monitor (Force Quit), then reopen it | Offer to open the book in safe mode. (Closing normally, or swiping the app away on iPhone, shows nothing.) |
