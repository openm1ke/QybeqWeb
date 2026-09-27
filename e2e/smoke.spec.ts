import { expect, test } from '@playwright/test'

async function declineAnalytics(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog', { name: /help improve qybeq/i })
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: /not now/i }).click()
}

test('opens a playable puzzle on desktop and mobile', async ({ page }) => {
  await page.goto('./')
  const dailyBox = await page.getByRole('button', { name: /daily challenge/i }).boundingBox()
  const puzzleBox = await page.getByRole('button', { name: /new puzzle/i }).boundingBox()
  expect(dailyBox?.y).toBeLessThan(puzzleBox?.y ?? 0)
  await page.getByRole('button', { name: /new puzzle/i }).click()
  await expect(page.getByRole('heading', { name: /fill every free cell/i })).toBeVisible()
  await expect(page.getByLabel('Puzzle')).toBeVisible()
  await expect(page.locator('.roll-die')).toHaveCount(6)
  await expect(page.getByRole('button', { name: /rolling coordinate dice/i })).toBeVisible()
  await page.getByRole('button', { name: /rolling coordinate dice/i }).click()
  await expect(page.locator('.piece-tray')).toBeVisible()
  await expect(page.getByText('0 of 8 placed')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('opens the bilingual how-to-play page from the menu', async ({ page }) => {
  await page.goto('./')
  await declineAnalytics(page)
  await page.getByRole('link', { name: /how to play/i }).click()
  await expect(page).toHaveURL(/how-to-play\.html$/)
  await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible()
  await page.getByRole('button', { name: 'Русский' }).click()
  await expect(page.getByRole('heading', { name: 'Как играть' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Назад' })).toBeVisible()
})

test('opens the privacy policy from the main page', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('dialog', { name: /help improve qybeq/i }).getByRole('link', { name: /privacy policy/i }).click()
  await expect(page).toHaveURL(/privacy\.html$/)
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
  await page.getByRole('button', { name: 'Русский' }).click()
  await expect(page.getByRole('heading', { name: 'Политика конфиденциальности' })).toBeVisible()
})

test('drags a piece without losing its grab point', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /new puzzle/i }).click()
  const line = page.getByRole('button', { name: 'Line piece' })
  const board = page.locator('.piece-layer')
  const lineBox = await line.boundingBox()
  const boardBox = await board.boundingBox()
  if (!lineBox || !boardBox) throw new Error('Game geometry is unavailable')
  const cell = boardBox.width / 6

  const grabPoint = { x: lineBox.x + lineBox.width / 2, y: lineBox.y + lineBox.height * .15 }
  await page.mouse.move(grabPoint.x, grabPoint.y)
  await page.mouse.down()
  await page.waitForTimeout(220)
  await expect(page.locator('.drag-overlay')).toBeVisible()
  await expect(line).toHaveCSS('opacity', '0')
  const overlayBox = await page.locator('.drag-overlay').boundingBox()
  if (!overlayBox) throw new Error('Drag overlay geometry is unavailable')
  expect(Math.abs(overlayBox.x + overlayBox.width / 2 - grabPoint.x)).toBeLessThan(2)
  expect(Math.abs(overlayBox.y + overlayBox.height / 2 - grabPoint.y)).toBeLessThan(2)
  await page.mouse.move(boardBox.x + cell / 2, boardBox.y + cell * 2, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText('1 of 8 placed')).toBeVisible()
  await expect(page.locator('.board-piece')).toHaveCount(1)
})

test('rotates a tray piece clockwise on click', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /new puzzle/i }).click()
  const line = page.getByRole('button', { name: 'Line piece' })
  const trayBefore = await page.locator('.piece-tray').boundingBox()
  await expect(line.locator('svg')).toHaveAttribute('viewBox', '0 0 100 400')
  await line.click()
  await expect(line.locator('.tray-piece-art')).toHaveClass(/turning/)
  await expect(line.locator('svg')).toHaveAttribute('viewBox', '0 0 400 100')
  await expect(page.locator('.drag-overlay')).toHaveCount(0)
  const trayAfter = await page.locator('.piece-tray').boundingBox()
  expect(trayAfter?.width).toBe(trayBefore?.width)
  expect(trayAfter?.height).toBe(trayBefore?.height)
})

test('persists a selected visual theme', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('qybeq.progress.v1', JSON.stringify({ availableStars: 12, solvedPuzzleCount: 4, unlockedThemeIds: ['classic'], dailyBestStars: {} })))
  await page.reload()
  await declineAnalytics(page)
  await page.getByRole('button', { name: /customize/i }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /neon, unlock for 12 stars/i }).click()
  await expect(page.getByText(/0 stars available/i)).toBeVisible()
  await page.getByRole('button', { name: /back/i }).click()
  await page.reload()
  await page.getByRole('button', { name: /new puzzle/i }).click()
  await expect(page.locator('.game-screen')).toHaveClass(/dice-smooth/)
  await expect(page.locator('.piece-svg').first()).toHaveClass(/material-neon/)
})

test('keeps unaffordable themes locked', async ({ page }) => {
  await page.goto('./')
  await declineAnalytics(page)
  await page.getByRole('button', { name: /customize/i }).click()
  await page.getByRole('button', { name: /neon, 0 \/ 12 stars/i }).click()
  await expect(page.getByRole('status')).toHaveText(/earn more stars/i)
  await expect(page.getByRole('button', { name: /qybeq classic/i })).toHaveAttribute('aria-pressed', 'true')
})

test('keeps every theme preview inside its board grid', async ({ page }) => {
  await page.goto('./')
  await declineAnalytics(page)
  await page.getByRole('button', { name: /customize/i }).click()
  const previews = page.locator('.theme-preview')
  for (let index = 0; index < await previews.count(); index += 1) {
    const preview = previews.nth(index)
    const gridBox = await preview.locator('.preview-grid').boundingBox()
    if (!gridBox) throw new Error('Preview grid geometry is unavailable')
    for (const item of ['.preview-die', '.preview-piece-one', '.preview-piece-two']) {
      const itemBox = await preview.locator(item).boundingBox()
      if (!itemBox) throw new Error(`Preview item geometry is unavailable: ${item}`)
      expect(itemBox.x).toBeGreaterThanOrEqual(gridBox.x - 1)
      expect(itemBox.y).toBeGreaterThanOrEqual(gridBox.y - 1)
      expect(itemBox.x + itemBox.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1)
      expect(itemBox.y + itemBox.height).toBeLessThanOrEqual(gridBox.y + gridBox.height + 1)
    }
  }
})

test('persists music and effect controls', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /settings/i }).click()
  await page.locator('label').filter({ hasText: 'Background playlist' }).locator('input').uncheck()
  await page.locator('label').filter({ hasText: 'Sound effects' }).locator('input').uncheck()
  await page.getByRole('button', { name: /back/i }).click()
  await page.reload()
  await page.getByRole('button', { name: /settings/i }).click()
  await expect(page.locator('label').filter({ hasText: 'Background playlist' }).locator('input')).not.toBeChecked()
  await expect(page.locator('label').filter({ hasText: 'Sound effects' }).locator('input')).not.toBeChecked()
})

test('switches and persists the interface language', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Русский' }).click()
  await expect(page.getByRole('button', { name: /новая головоломка/i })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /новая головоломка/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Русский' })).toHaveAttribute('aria-pressed', 'true')
})


test('loads Yandex Metrika only after consent and keeps the setting', async ({ page }) => {
  await page.route('https://mc.yandex.ru/**', (route) => route.abort())
  await page.goto('./')
  await expect(page.getByRole('dialog', { name: /help improve qybeq/i })).toBeVisible()
  await expect(page.locator('#qybeq-yandex-metrika')).toHaveCount(0)
  await page.getByRole('button', { name: /^allow$/i }).click()
  await expect(page.locator('#qybeq-yandex-metrika')).toHaveAttribute('src', /113110265/)
  expect(await page.evaluate(() => localStorage.getItem('qybeq.analytics.v1'))).toBe('enabled')

  await page.getByRole('button', { name: /settings/i }).click()
  const analytics = page.locator('label').filter({ hasText: 'Anonymous analytics' }).locator('input')
  await expect(analytics).toBeChecked()
  await analytics.uncheck()
  expect(await page.evaluate(() => localStorage.getItem('qybeq.analytics.v1'))).toBe('disabled')
})
