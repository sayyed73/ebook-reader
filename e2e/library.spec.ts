import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addBook, bookFrame, fixture } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.getByRole('list', { name: 'Books' })).toBeVisible();
}

function frameScrollY(page: Page) {
  return bookFrame(page)
    .locator('body')
    .evaluate(() => window.scrollY);
}

test('reopening a book returns to where you were, even after a restart', async ({ page }) => {
  await addBook(page, 'long-book.html');
  await expect(bookFrame(page).locator('#s60')).toBeAttached();
  await bookFrame(page)
    .locator('body')
    .evaluate(() => {
      window.scrollTo({ top: 2400, behavior: 'instant' });
    });
  // Position reports are throttled (500 ms); leaving the reader saves the latest one.
  await page.waitForTimeout(700);
  await backToLibrary(page);

  await page.getByRole('button', { name: /^Long Test Book/ }).click();
  await expect.poll(() => frameScrollY(page)).toBe(2400);

  await backToLibrary(page);
  await page.reload();
  await page.getByRole('button', { name: /^Long Test Book/ }).click();
  await expect.poll(() => frameScrollY(page)).toBe(2400);
});

test('recently opened books are listed first', async ({ page }) => {
  await addBook(page, 'long-book.html');
  await backToLibrary(page);
  await addBook(page, 'interactive-guide.html');
  await backToLibrary(page);
  const titles = page.locator('.book-card__title');
  await expect(titles).toHaveText(['Interactive Test Guide', 'Long Test Book']);

  await page.getByRole('button', { name: /^Long Test Book/ }).click();
  await backToLibrary(page);
  await expect(titles).toHaveText(['Long Test Book', 'Interactive Test Guide']);
  await expect(page.locator('.book-card__meta').first()).toHaveText(/^Opened /);
});

test('deleting a book removes it and its saved progress', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  await bookFrame(page).locator('.mark-btn[data-id="1"]').click();
  await expect(bookFrame(page).locator('.mark-btn[data-id="1"]')).toHaveText('Completed');
  await backToLibrary(page);

  await page.getByRole('button', { name: 'Delete Interactive Test Guide' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();

  await addBook(page, 'interactive-guide.html');
  await expect(bookFrame(page).locator('.mark-btn[data-id="1"]')).toHaveText('Mark complete');
});

test('adding the same file again opens the existing book', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  await bookFrame(page).locator('.mark-btn[data-id="3"]').click();
  await backToLibrary(page);

  await addBook(page, 'interactive-guide.html');
  await expect(bookFrame(page).locator('.mark-btn[data-id="3"]')).toHaveText('Completed');
  await backToLibrary(page);
  await expect(page.locator('.book-card')).toHaveCount(1);
});

test('replacing a book with a new version keeps its progress', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  await bookFrame(page).locator('.mark-btn[data-id="2"]').click();
  await expect(bookFrame(page).locator('.mark-btn[data-id="2"]')).toHaveText('Completed');
  await backToLibrary(page);

  const v2 = readFileSync(fixture('interactive-guide.html'), 'utf8').replace(
    '<h1>Interactive Test Guide</h1>',
    '<h1>Interactive Test Guide (2nd edition)</h1>',
  );
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add book' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'interactive-guide.html',
    mimeType: 'text/html',
    buffer: Buffer.from(v2),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click();

  await expect(bookFrame(page).locator('h1')).toHaveText('Interactive Test Guide (2nd edition)');
  await expect(bookFrame(page).locator('.mark-btn[data-id="2"]')).toHaveText('Completed');
  await backToLibrary(page);
  await expect(page.locator('.book-card')).toHaveCount(1);
});

test('after an unexpected exit, the open book is offered in safe mode', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  await expect(bookFrame(page).locator('.mark-btn')).toHaveCount(3);
  // Simulate a freeze/crash: the page goes away without a normal exit.
  const marker = await page.evaluate(() => localStorage.getItem('reader.open-book'));
  expect(marker).not.toBeNull();
  await page.goto('about:blank');
  await page.goto('/');
  await page.evaluate((value) => {
    if (value) localStorage.setItem('reader.open-book', value);
  }, marker);
  await page.reload();

  await page.getByRole('button', { name: 'Open in safe mode' }).click();
  await expect(page.getByText(/Safe mode is on/)).toBeVisible();
  await expect(bookFrame(page).locator('.mark-btn')).toHaveCount(0);
});

test('closing the reader normally leaves nothing to recover', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  await backToLibrary(page);
  await page.reload();
  await expect(page.locator('.book-card')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
