import { expect, test, type Page } from '@playwright/test'

// The Yandex Games build (`npm run dev:yandex`) with yandex/sdk-mock.js
// answering /sdk.js; see that file for the ya_* query parameters.
const yandexURL = 'http://127.0.0.1:5175/'

declare global {
  interface Window {
    __yaMock: { log: string[]; emit(event: string): void }
    __media: { elements: number; contexts: number }
  }
}

async function open(page: Page, query = 'ya_lang=en') {
  await page.addInitScript(() => {
    // Media elements are what make browsers show a system player (1.6.1.6);
    // count them, and the Web Audio contexts used instead.
    const counts = { elements: 0, contexts: 0 }
    window.__media = counts
    const NativeAudio = window.Audio
    window.Audio = function (source?: string) {
      counts.elements += 1
      return new NativeAudio(source)
    } as unknown as typeof Audio
    const NativeContext = window.AudioContext
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        counts.contexts += 1
      }
    }
  })
  await page.goto(`${yandexURL}?${query}`)
}

const sdkLog = (page: Page) => page.evaluate(() => [...window.__yaMock.log])

async function startPuzzle(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Roll Dice' }).click()
  await page.locator('.dice-roll-layer').click()
  await expect(page.locator('.dice-roll-layer')).toHaveCount(0)
  await expect(page.getByText('Fill every free cell')).toBeVisible()
}

/** An unfinished puzzle with every free hint spent, then Continue. */
async function continueWithoutFreeHints(page: Page, query: string) {
  await open(page, query)
  await page.evaluate(() => localStorage.setItem('qybeq.savedGame.v1', JSON.stringify({
    schemaVersion: 1,
    blocked: ['A6', 'B2', 'C5', 'D3', 'E2', 'F4'],
    orientations: {},
    placements: [],
    elapsedMs: 5000,
    hintsRemaining: 0,
    assistanceUsed: true,
  })))
  await page.reload()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await expect(page.getByText('Fill every free cell')).toBeVisible()
}

test('starts through the SDK in its language, with no links out of the game', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await expect.poll(() => sdkLog(page)).toEqual(expect.arrayContaining(['YaGames.init', 'LoadingAPI.ready']))
  // No analytics consent, no privacy page, no links at all (8.4.2, 3.5).
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('a')).toHaveCount(0)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByText('Anonymous analytics')).toHaveCount(0)
  await expect(page.locator('a')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
})

test('takes the language from the SDK, with the Yandex fallbacks', async ({ page }) => {
  await open(page, 'ya_lang=ru')
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeVisible()
  await page.goto(`${yandexURL}?ya_lang=kk`)
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeVisible()
  await page.goto(`${yandexURL}?ya_lang=tr`)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
})

test('plays sound through Web Audio only, never a media element', async ({ page }) => {
  await open(page)
  await startPuzzle(page)
  await page.locator('[data-piece="line4"]').click()
  await expect.poll(() => page.evaluate(() => window.__media.contexts)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.__media.elements)).toBe(0)
  await expect(page.locator('audio, video')).toHaveCount(0)
})

test('marks gameplay and pauses when the platform asks', async ({ page }) => {
  await open(page)
  await startPuzzle(page)
  await expect.poll(async () => (await sdkLog(page)).at(-1)).toBe('GameplayAPI.start')

  await page.evaluate(() => window.__yaMock.emit('game_api_pause'))
  await expect.poll(async () => (await sdkLog(page)).at(-1)).toBe('GameplayAPI.stop')
  const clock = page.getByLabel(/^Time /)
  const paused = await clock.getAttribute('aria-label')
  await page.waitForTimeout(1300)
  expect(await clock.getAttribute('aria-label')).toBe(paused)

  await page.evaluate(() => window.__yaMock.emit('game_api_resume'))
  await expect.poll(async () => (await sdkLog(page)).at(-1)).toBe('GameplayAPI.start')

  await page.getByRole('button', { name: 'Game menu' }).click()
  await expect.poll(async () => (await sdkLog(page)).at(-1)).toBe('GameplayAPI.stop')
})

test('offers one more hint for a rewarded video once the free ones are spent', async ({ page }) => {
  await continueWithoutFreeHints(page, 'ya_lang=en&ya_ad=reward&ya_ad_ms=800')
  await page.getByRole('button', { name: 'No free hints left. Watch a video for one more hint' }).click()
  const offer = page.getByRole('dialog', { name: 'Need another hint?' })
  await expect(offer.getByText('Watch a short video to reveal one placement.')).toBeVisible()
  await offer.getByRole('button', { name: 'Watch video' }).click()
  await expect(page.locator('[data-ya-mock-ad]')).toBeVisible()
  // Play is stopped for the video (4.7, 1.19.3).
  expect((await sdkLog(page)).filter((entry) => entry.startsWith('GameplayAPI')).at(-1)).toBe('GameplayAPI.stop')
  await expect(offer).toHaveCount(0)
  await expect(page.locator('.hint-layer')).toBeVisible()
  expect(await sdkLog(page)).toEqual(expect.arrayContaining(['adv.showRewardedVideo', 'adv.rewarded']))
  await expect.poll(async () => (await sdkLog(page)).at(-1)).toBe('GameplayAPI.start')
  // The clock runs again after the video, even though the platform resumes
  // the game only after onClose.
  const clock = page.getByLabel(/^Time /)
  const after = await clock.getAttribute('aria-label')
  await expect.poll(() => clock.getAttribute('aria-label'), { timeout: 4000 }).not.toBe(after)
})

test('gives no hint when the video is closed early', async ({ page }) => {
  await continueWithoutFreeHints(page, 'ya_lang=en&ya_ad=dismiss&ya_ad_ms=300')
  await page.getByRole('button', { name: /Watch a video for one more hint/ }).click()
  const offer = page.getByRole('dialog', { name: 'Need another hint?' })
  await offer.getByRole('button', { name: 'Watch video' }).click()
  await expect(offer.getByRole('status')).toHaveText('The video was closed early, so no hint this time.')
  await expect(offer.getByRole('button', { name: 'Retry' })).toBeVisible()
  await offer.getByRole('button', { name: 'Close' }).click()
  await expect(offer).toHaveCount(0)
  await expect(page.locator('.hint-layer')).toHaveCount(0)
})

test('never blocks the game when no video can be shown', async ({ page }) => {
  await continueWithoutFreeHints(page, 'ya_lang=en&ya_ad=error')
  await page.getByRole('button', { name: /Watch a video for one more hint/ }).click()
  await page.getByRole('dialog', { name: 'Need another hint?' }).getByRole('button', { name: 'Watch video' }).click()
  await expect(page.getByRole('dialog', { name: 'Need another hint?' })).toHaveCount(0)
  await expect(page.locator('.hint-layer')).toBeVisible()
})
