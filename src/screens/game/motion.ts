/** Timings shared by the board, tray and drag layer (mobile values). */
export const snapDurationMs = 160
export const shakeDurationMs = 360
/** Visual scale of a lifted piece; it settles 1.03 → 1.0 when it snaps. */
export const liftedScale = 1.03

/** Damped horizontal wobble used for rejected drops. */
export function shakeOffset(t: number, cellSize: number): number {
  if (t <= 0 || t >= 1) return 0
  return Math.sin(t * Math.PI * 6) * cellSize * 0.09 * (1 - t)
}
