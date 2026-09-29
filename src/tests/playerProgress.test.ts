import { beforeEach, describe, expect, it } from 'vitest'
import { presets as themes } from '../cosmetics/skins'
import { awardCompletion, currentDailyStreak, loadPlayerProgress, purchaseTheme, savePlayerProgress } from '../progress/playerProgress'

describe('player progress', () => {
  beforeEach(() => localStorage.clear())

  it('persists earned stars and unlocks an affordable theme', () => {
    let progress = loadPlayerProgress()
    for (let index = 0; index < 4; index += 1) progress = awardCompletion(progress, 'new', 3)
    const purchased = purchaseTheme(progress, themes[1])
    expect(purchased?.availableStars).toBe(0)
    expect(purchased?.unlockedThemeIds).toContain('neon')
    savePlayerProgress(purchased!)
    expect(loadPlayerProgress().unlockedThemeIds).toContain('neon')
  })

  it('records only the best daily reward and calculates a streak', () => {
    let progress = loadPlayerProgress()
    progress = awardCompletion(progress, 'daily', 2, new Date(2026, 8, 27))
    progress = awardCompletion(progress, 'daily', 3, new Date(2026, 8, 27))
    progress = awardCompletion(progress, 'daily', 2, new Date(2026, 8, 28))
    expect(progress.availableStars).toBe(5)
    expect(progress.solvedPuzzleCount).toBe(2)
    expect(currentDailyStreak(progress, new Date(2026, 8, 28))).toBe(2)
  })

  it('does not unlock a theme without enough stars', () => {
    expect(purchaseTheme(loadPlayerProgress(), themes[1])).toBeNull()
  })
})
