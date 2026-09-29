export const dailyEpoch = new Date(2026, 0, 1)

export class StableRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
    if (this.state === 0) this.state = 0x6d2b79f5
  }

  next32(): number {
    let value = this.state
    value = (value ^ (value << 13)) >>> 0
    value = (value ^ (value >>> 17)) >>> 0
    value = (value ^ (value << 5)) >>> 0
    this.state = value >>> 0
    return this.state
  }

  nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) throw new RangeError('max must be a positive integer')
    return this.next32() % max
  }

  nextDouble(): number {
    return this.next32() / 0x100000000
  }

  nextBool(): boolean {
    return (this.next32() & 1) === 1
  }
}

export function dailyKey(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dailyDayIndex(date: Date): number {
  const localDayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const epochUtc = Date.UTC(dailyEpoch.getFullYear(), dailyEpoch.getMonth(), dailyEpoch.getDate())
  return Math.floor((localDayUtc - epochUtc) / 86_400_000)
}

export function dailySeed(date: Date): number {
  return (0x51b3a77d ^ Math.imul(dailyDayIndex(date), 0x0009e377)) >>> 0
}

export function timeUntilNextDaily(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(0, next.getTime() - now.getTime())
}
