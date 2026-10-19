#!/usr/bin/env node
/**
 * Security and persistence check of the real desktop app (production build) on Linux, driven
 * through WebKitGTK's WebDriver. Complements the browser tests: this runs inside the actual
 * Tauri shell (bookframe protocol, file storage, Tauri IPC).
 *
 * Usage (see docs/SECURITY_TESTS.md):
 *   npx tauri build --no-bundle
 *   TAURI_WEBVIEW_AUTOMATION=true xvfb-run -a sh -c \
 *     'WebKitWebDriver --port=4444 & sleep 2; node e2e/native/check-tauri-linux.mjs'
 *
 * Books are added through the app's own commands because WebDriver can't drive the native
 * file dialog. They use fixed ids (`check-…`) that can't collide with real books (UUIDs) and
 * are removed before and after the run.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WD = process.env.WEBDRIVER_URL ?? 'http://127.0.0.1:4444';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const APP = process.env.APP_BINARY ?? join(ROOT, 'src-tauri/target/release/html-book-reader');
const FIXTURES = join(ROOT, 'e2e/fixtures');
const ELEMENT_KEY = 'element-6066-11e4-a52e-4f61-b7ab-a8a10d1e5f2a';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
}

async function wd(method, path, body) {
  const response = await fetch(WD + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (json.value?.error) throw new Error(`${path}: ${json.value.error} ${json.value.message}`);
  return json.value;
}

const { sessionId } = await wd('POST', '/session', {
  capabilities: { alwaysMatch: { 'webkitgtk:browserOptions': { binary: APP, args: [] } } },
});
const S = `/session/${sessionId}`;
const ref = (element) => element[ELEMENT_KEY] ?? Object.values(element)[0];
const exec = (script, args = []) => wd('POST', `${S}/execute/sync`, { script, args });
const execAsync = (script, args = []) => wd('POST', `${S}/execute/async`, { script, args });
const find = async (css) =>
  ref(await wd('POST', `${S}/element`, { using: 'css selector', value: css }));
const click = async (css) => wd('POST', `${S}/element/${await find(css)}/click`, {});
const text = async (css) => wd('GET', `${S}/element/${await find(css)}/text`);
const toTop = () => wd('POST', `${S}/frame`, { id: null });

async function waitFor(probe, ms = 10_000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await probe();
      if (last) return last;
    } catch (error) {
      last = error.message;
    }
    await sleep(200);
  }
  throw new Error(`timed out: ${last}`);
}

async function toFrame() {
  await waitFor(() => find('iframe.book-frame'));
  await wd('POST', `${S}/frame`, { id: 0 });
}

const invoke = (cmd, args) =>
  execAsync(
    `const done = arguments[arguments.length - 1];
     window.__TAURI_INTERNALS__.invoke(arguments[0], arguments[1])
       .then((value) => done({ ok: value ?? null }), (error) => done({ err: String(error) }));`,
    [cmd, args],
  );

const SEEDS = [
  ['check-guide', 'Check Guide', 'interactive-guide.html'],
  ['check-hostile', 'Check Hostile', 'hostile/escape-attempts.html'],
  ['check-nav', 'Check Nav', 'hostile/navigate-by-script.html'],
  ['check-victim', 'Check Victim', 'long-book.html'],
];

async function openBook(title) {
  await waitFor(() => find('.book-card'));
  for (const card of await wd('POST', `${S}/elements`, {
    using: 'css selector',
    value: '.book-card__open',
  })) {
    const id = ref(card);
    if ((await wd('GET', `${S}/element/${id}/text`)).startsWith(title)) {
      await wd('POST', `${S}/element/${id}/click`, {});
      break;
    }
  }
  await toFrame();
}

async function backToLibrary() {
  await toTop();
  await click('button[aria-label="Back to library"]');
}

try {
  for (const [id] of SEEDS) await invoke('library_delete', { id });
  for (const [id, title, file] of SEEDS) {
    const html = readFileSync(join(FIXTURES, file), 'utf8');
    const book = {
      id,
      title,
      fileName: `${id}.html`,
      sizeBytes: html.length,
      contentHash: id,
      importedAt: Date.now(),
      lastOpenedAt: null,
      position: null,
    };
    const result = await invoke('library_add', { book, content: html });
    if (result.err) throw new Error(`seeding ${id}: ${result.err}`);
  }
  const traversal = await invoke('library_get', { id: '../../etc' });
  check(
    'library rejects ids that leave its folder',
    traversal.err === 'invalid book id',
    traversal.err,
  );
  await exec('location.reload()');
  await sleep(1500);

  // Hostile book inside the native shell.
  await openBook('Check Hostile');
  const frameUrl = await exec('return location.href');
  check('book runs on the bookframe origin', /bookframe/.test(frameUrl), frameUrl);
  const globals = await exec(
    'return [typeof window.__TAURI_INTERNALS__, typeof window.__TAURI__, typeof window.ipc].join()',
  );
  check('no Tauri globals in the book frame', globals === 'undefined,undefined,undefined', globals);
  // Forge IPC calls from the frame: WebKit exposes the native handler to subframes, but
  // Tauri drops messages without the per-launch invoke key (main frame only).
  await execAsync(
    `const done = arguments[arguments.length - 1];
     try { window.webkit.messageHandlers.ipc.postMessage(JSON.stringify({ cmd: 'library_delete', callback: 1, error: 2, payload: { id: 'check-victim' } })); } catch (e) {}
     fetch('ipc://localhost/library_delete', { method: 'POST', body: '{"id":"check-victim"}', headers: { 'Content-Type': 'application/json', 'Tauri-Callback': '1', 'Tauri-Error': '2' } })
       .catch(() => {}).finally(() => setTimeout(done, 800));`,
  );
  const probes = JSON.parse(
    await waitFor(async () => {
      const t = await text('#results');
      return t !== 'running' && t;
    }, 12_000),
  );
  const leaks = Object.entries(probes).filter(([, value]) => value !== 'blocked');
  check(
    'all hostile probes blocked',
    leaks.length === 0 && Object.keys(probes).length >= 20,
    JSON.stringify(leaks),
  );
  await toTop();
  const victim = await invoke('library_get', { id: 'check-victim' });
  check('forged IPC from the book frame had no effect', victim.ok?.title === 'Check Victim');
  await click('button[aria-label="Back to library"]');

  // Progress is written to files and survives an app reload.
  await openBook('Check Guide');
  check(
    'book renders in standards mode',
    (await waitFor(() => text('#mode'))) === 'Render mode: CSS1Compat',
  );
  await click('.mark-btn[data-id="2"]');
  await backToLibrary();
  await sleep(600);
  const stored = await invoke('book_storage_load', { id: 'check-guide' });
  check(
    'book data saved to app storage',
    stored.ok?.guide_completed === '{"2":true}',
    JSON.stringify(stored),
  );
  await exec('location.reload()');
  await sleep(1500);
  await openBook('Check Guide');
  check(
    'progress restored after reload',
    (await waitFor(() => text('.mark-btn[data-id="2"]'))) === 'Completed',
  );
  await backToLibrary();

  // Navigation away is refused or recoverable.
  await openBook('Check Nav');
  await waitFor(() => text('#status'));
  await click('#go');
  await sleep(3000);
  await toTop();
  const viewport = await exec(
    'return document.querySelector(".reader__viewport")?.innerText ?? ""',
  );
  let recovered = !viewport.includes('tried to open another page');
  if (!recovered) {
    await click('.reader__viewport button');
    await toFrame();
    recovered = (await waitFor(() => text('#status'))) === 'loaded';
  }
  check('navigation away from the book is contained', recovered);
} catch (error) {
  check('check script completed', false, error.message);
} finally {
  await toTop().catch(() => {});
  for (const [id] of SEEDS) await invoke('library_delete', { id }).catch(() => {});
  await wd('DELETE', S).catch(() => {});
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
