import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * End-to-end and security tests against the production web build (`vite preview`), so the
 * real CSPs and the built frame page are what get tested.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    // WebKit = the engine of macOS/iPhone WebViews. Opt in locally with PW_WEBKIT=1 after
    // `npx playwright install webkit`; always on in CI.
    ...(process.env['CI'] || process.env['PW_WEBKIT']
      ? [
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
          { name: 'mobile-webkit', use: { ...devices['iPhone 14'] } },
        ]
      : []),
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
