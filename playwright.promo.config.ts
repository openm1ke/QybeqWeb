import { defineConfig } from '@playwright/test'

// Catalog screenshots, videos and covers for Yandex Games:
// `npm run promo:yandex` (after `npm run build:yandex`) → release/yandex-store/.
export default defineConfig({
  testDir: './promo',
  workers: 1,
  reporter: 'line',
  webServer: [
    { command: 'npx vite preview --mode yandex --host 127.0.0.1 --port 5177 --strictPort', url: 'http://127.0.0.1:5177', reuseExistingServer: true },
    { command: 'npx vite --host 127.0.0.1 --port 5178 --strictPort', url: 'http://127.0.0.1:5178', reuseExistingServer: true },
  ],
  use: { channel: 'chrome' },
})
