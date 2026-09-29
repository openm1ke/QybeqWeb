import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

// Runs the suite on the installed Google Chrome, no Playwright browser
// download needed: `npm run test:e2e:chrome`.
export default defineConfig({
  ...base,
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 5190', url: 'http://127.0.0.1:5190', reuseExistingServer: true },
    { command: 'npm run dev:yandex -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: true },
  ],
  use: { ...base.use, baseURL: 'http://127.0.0.1:5190', channel: 'chrome' },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'], channel: 'chrome' } },
  ],
})
