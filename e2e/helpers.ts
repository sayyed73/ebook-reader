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
