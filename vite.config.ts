import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Netlify exposes the production URL as `URL` (and deploy previews as
 * DEPLOY_PRIME_URL). Social crawlers need absolute og:image / canonical
 * URLs, so %SITE_URL% in the HTML is replaced at build time.
 */
const siteUrl = (process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');

export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'site-url',
      transformIndexHtml(html) {
        // Without a known site URL a canonical would be relative (invalid),
        // so drop it; og:image falls back to a root-relative path.
        const out = siteUrl ? html : html.replace(/^\s*<link rel="canonical"[^>]*>\s*\n/gm, '');
        return out.replace(/%SITE_URL%/g, siteUrl);
      },
    },
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    // Phaser is one large chunk by nature; the gzip size (~385KB) is well
    // inside the 2MB initial-load budget.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        static: resolve(import.meta.dirname, 'static.html'),
      },
    },
  },
  server: {
    host: true,
    port: 3000,
  },
});
