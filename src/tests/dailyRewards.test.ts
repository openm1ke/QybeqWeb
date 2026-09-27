import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/game-parity.v1.json'
import { dailyDayIndex, dailyKey, dailySeed, StableRandom, timeUntilNextDaily } from '../game/daily'
import { starsForAttempt } from '../game/rewards'

describe('daily puzzle primitives', () => {
  it('uses the fixed local-calendar epoch and stable xorshift sequence', () => {
    const date = new Date(2026, 0, 1, 14, 0)
    expect(dailyKey(date)).toBe('2026-01-01')
    expect(dailyDayIndex(date)).toBe(0)
    expect(dailySeed(date)).toBe(0x51b3a77d)
    const random = new StableRandom(1)
    expect([random.next32(), random.next32(), random.next32()]).toEqual([270369, 67634689, 2647435461])
  })

  it('counts down to the next local midnight', () => {
    expect(timeUntilNextDaily(new Date(2026, 8, 27, 23, 59, 30))).toBe(30_000)
  })
})

describe('rewards', () => {
  it.each(fixture.rewardCases)('awards $stars star(s)', ({ elapsedMs, assistanceUsed, stars }) => {
    expect(starsForAttempt(elapsedMs, assistanceUsed)).toBe(stars)
  })
})
