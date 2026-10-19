import { fileURLToPath, URL } from 'node:url';
import { rolldown } from 'rolldown';
import type { Connect, Plugin } from 'vite';
import { BOOK_FRAME_CSP } from '../src/core/reader/frame-policy.ts';

/**
 * Builds `frame.html`: the page that hosts a book inside the sandboxed iframe. It contains
 * only a CSP and the bundled bootstrap script, inlined so the page is a single file that any
 * host (dev server, static hosting, Tauri custom protocol) can serve.
 */
export const BOOK_FRAME_PAGE = 'frame.html';

const srcDir = fileURLToPath(new URL('../src', import.meta.url));
const bootstrapEntry = fileURLToPath(new URL('../src/frame/bootstrap.ts', import.meta.url));

async function bundleBootstrap(minify: boolean): Promise<string> {
  const bundle = await rolldown({
    input: bootstrapEntry,
    platform: 'browser',
    resolve: { alias: { '@': srcDir } },
  });
  try {
    const { output } = await bundle.generate({ format: 'iife', minify });
    const [chunk] = output;
    return chunk.code;
  } finally {
    await bundle.close();
  }
}

export function renderFramePage(bootstrapCode: string): string {
  const csp = BOOK_FRAME_CSP.replace(/"/g, '&quot;');
  const script = bootstrapCode.replace(/<\/script/gi, '<\\/script');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<script>${script}</script>`,
    '</head><body></body></html>',
  ].join('\n');
}

function isFramePageRequest(req: Connect.IncomingMessage): boolean {
  return req.url?.split('?')[0] === `/${BOOK_FRAME_PAGE}`;
}

export function bookFramePage(): Plugin {
  return {
    name: 'book-frame-page',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isFramePageRequest(req)) {
          next();
          return;
        }
        bundleBootstrap(false).then(
          (code) => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Security-Policy', BOOK_FRAME_CSP);
            res.setHeader('Cache-Control', 'no-store');
            res.end(renderFramePage(code));
          },
          (error: unknown) => {
            next(error);
          },
        );
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (isFramePageRequest(req)) res.setHeader('Content-Security-Policy', BOOK_FRAME_CSP);
        next();
      });
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: BOOK_FRAME_PAGE,
        source: renderFramePage(await bundleBootstrap(true)),
      });
    },
  };
}
