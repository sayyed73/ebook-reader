import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { bookFramePage } from './vite-plugins/book-frame-page.ts';

// Tauri runs the dev server on a fixed port and expects it to fail rather than move.
const host = process.env['TAURI_DEV_HOST'];

/**
 * CSP for the trusted app UI in browser builds. Not applied in dev (Vite's dev server relies on
 * inline scripts for hot reload) or in Tauri builds, which get `app.security.csp` from
 * src-tauri/tauri.conf.json instead (a second policy here would block the book frame there).
 */
const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function appCspPlugin(): Plugin {
  return {
    name: 'app-csp',
    apply: (_config, env) => env.command === 'build' && !process.env['TAURI_ENV_PLATFORM'],
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: APP_CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), appCspPlugin(), bookFramePage()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host ?? false,
    hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: 'es2022',
    sourcemap: Boolean(process.env['TAURI_ENV_DEBUG']),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
