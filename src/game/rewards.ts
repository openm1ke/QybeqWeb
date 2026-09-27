export const fastThresholdMs = 60_000

export function starsForAttempt(elapsedMs: number, assistanceUsed: boolean): 1 | 2 | 3 {
  if (assistanceUsed) return 1
  return elapsedMs <= fastThresholdMs ? 3 : 2
}
