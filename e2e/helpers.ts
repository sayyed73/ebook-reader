import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

export function fixture(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
}

/** Records every request that would leave the app's own origin, and blocks it. */
export async function trackExternalRequests(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.context().route(
    (url) => url.hostname !== 'localhost',
    async (route) => {
      external.push(route.request().url());
      await route.abort();
    },
  );
  return external;
}

/** Adds a book through the real file chooser and waits for the reader to open it. */
export async function addBook(page: Page, fixtureName: string): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add book' }).first().click();
  await (await chooser).setFiles(fixture(fixtureName));
  await expect(page.getByRole('button', { name: 'Back to library' })).toBeVisible();
}

export function bookFrame(page: Page) {
  return page.frameLocator('iframe.book-frame');
}

/** All books' saved localStorage entries, read straight from the browser build's database. */
export function readSavedBookStorage(page: Page): Promise<Record<string, string>[]> {
  return page.evaluate(
    () =>
      new Promise<Record<string, string>[]>((resolve, reject) => {
        const open = indexedDB.open('reader-library');
        open.onerror = () => {
          reject(new Error('cannot open the library database'));
        };
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('book-storage').objectStore('book-storage').getAll();
          request.onsuccess = () => {
            db.close();
            resolve(request.result as Record<string, string>[]);
          };
        };
      }),
  );
}

/**
 * Collects browser errors so a failing test can show them. Content Security Policy refusals are
 * left out: books loading remote fonts etc. trigger them by design.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('Content Security Policy')) {
      errors.push(`console: ${text}`);
    }
  });
  return errors;
}
