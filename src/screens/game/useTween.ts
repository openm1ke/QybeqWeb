import { useEffect, useRef, useState } from 'react'

/** Animates towards [target] like Flutter's implicit animations. */
export function useAnimatedValue(target: number, durationMs: number, curve: (t: number) => number = (t) => t): number {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const from = current.current
    if (from === target) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs)
      const next = from + (target - from) * curve(t)
      current.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // curve is expected to be a stable function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])
  return value
}

/**
 * 0 → 1 over [durationMs] each time [trigger] changes to a non-null value;
 * 1 when idle. The restart is derived during render, so the first frame of
 * an animation is never the end pose.
 */
export function useProgress(trigger: number | null, durationMs: number): number {
  const [state, setState] = useState<{ trigger: number | null; value: number }>({ trigger, value: 1 })
  if (trigger !== state.trigger) setState({ trigger, value: trigger == null ? 1 : 0 })
  useEffect(() => {
    if (trigger == null) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setState({ trigger, value: t })
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [trigger, durationMs])
  return trigger === state.trigger ? state.value : trigger == null ? 1 : 0
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}
