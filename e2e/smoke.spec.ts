import { expect, test } from '@playwright/test'

test('opens a playable puzzle on desktop and mobile', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /new puzzle/i }).click()
  await expect(page.getByRole('heading', { name: /fill every free cell/i })).toBeVisible()
  await expect(page.getByLabel('Puzzle')).toBeVisible()
  await expect(page.getByText('0 of 8 placed')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
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

  await page.mouse.move(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(220)
  await expect(page.locator('.drag-overlay')).toBeVisible()
  await page.mouse.move(boardBox.x + cell / 2, boardBox.y + cell * 2, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText('1 of 8 placed')).toBeVisible()
  await expect(page.locator('.board-piece')).toHaveCount(1)
})

test('rotates a tray piece clockwise on click', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /new puzzle/i }).click()
  const line = page.getByRole('button', { name: 'Line piece' })
  await expect(line.locator('svg')).toHaveAttribute('viewBox', '0 0 100 400')
  await line.click()
  await expect(line.locator('svg')).toHaveAttribute('viewBox', '0 0 400 100')
  await expect(page.locator('.drag-overlay')).toHaveCount(0)
})

test('persists a selected visual theme', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /customize/i }).click()
  await page.getByRole('button', { name: /neon/i }).click()
  await page.getByRole('button', { name: /back/i }).click()
  await page.reload()
  await page.getByRole('button', { name: /new puzzle/i }).click()
  await expect(page.locator('.game-screen')).toHaveClass(/dice-smooth/)
  await expect(page.locator('.piece-svg').first()).toHaveClass(/material-neon/)
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
