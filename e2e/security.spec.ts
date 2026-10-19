import { expect, test, type Page } from '@playwright/test';
import { addBook, bookFrame, trackExternalRequests } from './helpers';

/**
 * Hostile books (e2e/fixtures/hostile) attempt to escape the reader. Each must fail without
 * any request leaving the app. See docs/SECURITY.md and docs/SECURITY_TESTS.md.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a hostile book cannot reach the app, the network or native APIs', async ({ page }) => {
  const external = await trackExternalRequests(page);
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  const popups: string[] = [];
  page.context().on('page', (popup) => popups.push(popup.url()));
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.url()));

  await addBook(page, 'hostile/escape-attempts.html');

  const results = bookFrame(page).locator('#results');
  await expect(results).not.toHaveText('running', { timeout: 10_000 });
  const outcome = JSON.parse((await results.textContent()) ?? '{}') as Record<string, string>;

  const leaked = Object.entries(outcome).filter(([, value]) => value !== 'blocked');
  expect(leaked).toEqual([]);
  expect(Object.keys(outcome).length).toBeGreaterThanOrEqual(20);

  expect(external).toEqual([]);
  expect(dialogs).toEqual([]);
  expect(popups).toEqual([]);
  expect(downloads).toEqual([]);
  // The app itself is untouched and still on its own page.
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hostile: escape attempts');
});

/**
 * Engines differ in how a blocked frame navigation looks: WebKit refuses it before the book page
 * unloads (the book simply stays), Chromium unloads it and the app offers "Reload book". Either
 * way the book must end up readable again and nothing may leave the app.
 */
async function expectBookRecovered(page: Page) {
  await page.waitForTimeout(2500); // longer than the app's reload grace period
  const reload = page.getByRole('button', { name: 'Reload book' });
  if (await reload.isVisible()) await reload.click();
  await expect(bookFrame(page).locator('#status')).toHaveText('loaded');
}

for (const trigger of ['#go', '#detached-link']) {
  test(`a book that navigates away (${trigger}) is stopped`, async ({ page }) => {
    const external = await trackExternalRequests(page);
    await addBook(page, 'hostile/navigate-by-script.html');
    const book = bookFrame(page);
    await expect(book.locator('#status')).toHaveText('loaded');

    await book.locator(trigger).click();

    await expectBookRecovered(page);
    expect(external).toEqual([]);
  });
}

test('a meta refresh to a website is stopped', async ({ page }) => {
  const external = await trackExternalRequests(page);
  await addBook(page, 'hostile/meta-refresh.html');

  await page.waitForTimeout(2500);
  for (const frame of page.frames()) expect(frame.url()).not.toContain('evil.test');
  expect(external).toEqual([]);
});

test("books cannot see each other's saved data", async ({ page }) => {
  await addBook(page, 'hostile/navigate-by-script.html');
  await expect(bookFrame(page).locator('#status')).toHaveText('loaded');
  await page.getByRole('button', { name: 'Back to library' }).click();
  await addBook(page, 'interactive-guide.html');

  const keys = await bookFrame(page)
    .locator('body')
    .evaluate(() => Object.keys(window.localStorage));
  expect(keys).not.toContain('secret');
});
