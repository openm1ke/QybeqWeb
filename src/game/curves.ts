/** Flutter's `Curves`, evaluated like `Cubic.transform`. */
export type Curve = (t: number) => number

function cubic(a: number, b: number, c: number, d: number): Curve {
  const evaluate = (p1: number, p2: number, m: number) =>
    3 * p1 * (1 - m) * (1 - m) * m + 3 * p2 * (1 - m) * m * m + m * m * m
  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let start = 0
    let end = 1
    for (;;) {
      const midpoint = (start + end) / 2
      const estimate = evaluate(a, c, midpoint)
      if (Math.abs(t - estimate) < 0.001) return evaluate(b, d, midpoint)
      if (estimate < t) start = midpoint
      else end = midpoint
    }
  }
}

export const curves = {
  linear: (t: number) => t,
  easeIn: cubic(0.42, 0, 1, 1),
  easeOut: cubic(0, 0, 0.58, 1),
  easeInOut: cubic(0.42, 0, 0.58, 1),
  easeOutCubic: cubic(0.215, 0.61, 0.355, 1),
  easeInCubic: cubic(0.55, 0.055, 0.675, 0.19),
  easeInOutCubic: cubic(0.645, 0.045, 0.355, 1),
  easeOutBack: cubic(0.175, 0.885, 0.32, 1.275),
} as const satisfies Record<string, Curve>

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
