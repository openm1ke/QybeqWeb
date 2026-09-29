import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** Pages that belong to the open web only (linked from outside the game). */
const webOnlyFiles = ['privacy.html', 'support.html', 'robots.txt', 'how-to-play.html']

/**
 * The Yandex Games archive: index.html loads the SDK from `/sdk.js` exactly
 * as the platform documents it (requirement 1.19.1); the web-only pages are
 * left out. Locally, `/sdk.js` is answered by `yandex/sdk-mock.js`.
 */
function yandexGames(): Plugin {
  let outDir = ''
  const serveMock: Connect.NextHandleFunction = (_request, response) => {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    response.end(readFileSync(resolve(import.meta.dirname, 'yandex/sdk-mock.js')))
  }
  return {
    name: 'qybeq-yandex-games',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    // Added after Vite's own HTML processing, so the path stays `/sdk.js`.
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'script', attrs: { src: '/sdk.js' }, injectTo: 'head-prepend' }],
    },
    configureServer(server) {
      server.middlewares.use('/sdk.js', serveMock)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/sdk.js', serveMock)
    },
    closeBundle() {
      for (const file of webOnlyFiles) rmSync(resolve(outDir, file), { force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const yandex = mode === 'yandex'
  return {
    base: './',
    plugins: [react(), ...(yandex ? [yandexGames()] : [])],
    build: {
      outDir: yandex ? 'dist-yandex' : 'dist',
      rollupOptions: {
        // On the web the tutorial is also its own page, linked from Support.
        input: (yandex ? { main: 'index.html' } : { main: 'index.html', howToPlay: 'how-to-play.html' }) as Record<string, string>,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
