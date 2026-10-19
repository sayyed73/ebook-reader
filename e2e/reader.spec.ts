import { expect, test } from '@playwright/test';
import {
  addBook,
  bookFrame,
  collectPageErrors,
  readSavedBookStorage,
  trackExternalRequests,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('an interactive book runs and keeps its progress across app restarts', async ({ page }) => {
  const external = await trackExternalRequests(page);
  const errors = collectPageErrors(page);
  await addBook(page, 'interactive-guide.html');
  const book = bookFrame(page);

  // Script-rendered content, standards mode, inline handlers.
  await expect(book.locator('#mode')).toHaveText('Render mode: CSS1Compat');
  await book.locator('.mark-btn[data-id="2"]').click();
  await expect(book.locator('.mark-btn[data-id="2"]')).toHaveText('Completed');

  // Tabs toggled by script, and a note saved on input.
  await book.getByRole('button', { name: 'Notes' }).click();
  await book.locator('#note').fill('Bed by 11');

  // Leaving the reader waits for the book's data to be stored, so once the library is shown
  // the data must already be in the database.
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.getByRole('list', { name: 'Books' })).toBeVisible();
  expect(await readSavedBookStorage(page), `errors: ${errors.join(' | ')}`).toEqual([
    { guide_completed: '{"2":true}', guide_note: 'Bed by 11' },
  ]);

  // Restart the app and reopen the book.
  await page.reload();
  await page.getByRole('button', { name: /^Interactive Test Guide/ }).click();

  await expect(book.locator('.mark-btn[data-id="2"]')).toHaveText('Completed');
  await expect(book.locator('.mark-btn[data-id="1"]')).toHaveText('Mark complete');
  await book.getByRole('button', { name: 'Notes' }).click();
  await expect(book.locator('#note')).toHaveValue('Bed by 11');

  // The remote font in the book is blocked, never fetched.
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('in-page links work and links to other pages are suppressed', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  const book = bookFrame(page);

  await book.locator('#to-last').click();
  await expect(book.locator('#chapter-3')).toBeVisible();

  await book.locator('#external').click();
  await expect(page.getByRole('status').filter({ hasText: 'Links to other pages' })).toBeVisible();
  await expect(book.locator('h1')).toHaveText('Interactive Test Guide');
});

test('a book can reload itself and gets its latest data back', async ({ page }) => {
  await addBook(page, 'interactive-guide.html');
  const book = bookFrame(page);

  await book.locator('.mark-btn[data-id="1"]').click();
  await expect(book.locator('.mark-btn[data-id="1"]')).toHaveText('Completed');
  await book.locator('#reset').click();

  await expect(book.locator('.mark-btn[data-id="1"]')).toHaveText('Mark complete');
  await expect(page.getByText('This book tried to open another page')).toHaveCount(0);
});

test('rejects files that are not HTML books', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add book' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  });
  await expect(page.getByRole('alert')).toContainText('Only HTML books');
});
