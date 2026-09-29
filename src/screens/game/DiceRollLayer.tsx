import { useEffect, useLayoutEffect, useRef } from 'react'
import type { DiceSkin } from '../../cosmetics/skins'
import { cellLabel } from '../../game/cells'
import {
  dieFaceCells,
  dieFrameAt,
  dieHeightScale,
  dieTarget,
  rollTotal,
  type DiceRollPlan,
  type DieFrame,
  type DieSpec,
} from '../../game/diceRoll'
import { black, css, withAlpha, type Rgba } from '../../rendering/color'
import { blurred, roundedRect } from '../../rendering/canvas'
import { paintBlockedTile, paintDieFace } from '../../rendering/boardPainter'
import { cellGap } from '../../rendering/pieceGeometry'
import { faceCssMatrix, visibleFaces } from '../../rendering/dice3d'

/**
 * The opening roll (mobile `DiceRollLayer` + `DiceRollPainter`). The dice
 * are real perspective cubes: every visible face is a small canvas placed
 * with the painter's own projection matrix via CSS `matrix3d`. Shadows,
 * motion streaks and landing rings are painted on one canvas below them.
 * While it runs it swallows input; a tap anywhere skips to the end.
 */
export function DiceRollLayer({ plan, skin, grid, startedAt, onSkip, onFinished }: {
  plan: DiceRollPlan
  skin: DiceSkin
  /** Grid area in layer coordinates. */
  grid: { left: number; top: number; size: number }
  startedAt: number
  onSkip: () => void
  onFinished: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const effects = useRef<HTMLCanvasElement>(null)
  const dieRefs = useRef<(HTMLDivElement | null)[]>([])
  const faceRefs = useRef<(HTMLCanvasElement | null)[][]>([])
  const tileRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const finished = useRef(false)
  const cell = grid.size / 6
  const pixelRatio = Math.min(3, window.devicePixelRatio || 1)
  const faceBitmap = Math.ceil(cell * 1.6 * pixelRatio)

  // The landed tiles: painted once, revealed while each die blends into its cell.
  useLayoutEffect(() => {
    plan.dice.forEach((die, i) => {
      const canvas = tileRefs.current[i]
      if (!canvas) return
      const overflow = Math.ceil(cell * 0.4)
      canvas.width = Math.ceil((cell + overflow * 2) * pixelRatio)
      canvas.height = canvas.width
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, overflow * pixelRatio, overflow * pixelRatio)
      paintBlockedTile(ctx, cell, cellLabel(dieTarget(die)), skin)
    })
  }, [plan, skin, cell, pixelRatio])

  useEffect(() => {
    let frame = 0
    const faceKeys = plan.dice.map(() => Array<string>(6).fill(''))
    const total = rollTotal(plan)

    const draw = (now: number) => {
      const t = Math.min(total, (now - startedAt) / 1000)
      const frames = plan.dice.map((die) => dieFrameAt(plan, die, t))
      paintEffects(t, frames)
      frames.forEach((frame, i) => placeDie(plan.dice[i], frame, i, faceKeys[i]))
      // Lower dice first, so a die in the air passes over the others.
      const order = frames.map((f, i) => [f.height, i] as const).sort((a, b) => a[0] - b[0])
      order.forEach(([, i], rank) => {
        const node = dieRefs.current[i]
        if (node) node.style.zIndex = String(rank + 1)
      })
      if (t >= total) {
        if (!finished.current) {
          finished.current = true
          onFinished()
        }
        return
      }
      frame = requestAnimationFrame(draw)
    }

    const toLayer = (x: number, y: number) => ({ x: grid.left + x * cell, y: grid.top + y * cell })
    const tileSide = cell - cellGap(cell)

    const paintEffects = (t: number, frames: DieFrame[]) => {
      const canvas = effects.current
      const host = root.current
      if (!canvas || !host) return
      const width = host.clientWidth
      const height = host.clientHeight
      const ratio = Math.min(2, pixelRatio)
      if (canvas.width !== Math.ceil(width * ratio)) canvas.width = Math.ceil(width * ratio)
      if (canvas.height !== Math.ceil(height * ratio)) canvas.height = Math.ceil(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      frames.forEach((frame, i) => {
        const die = plan.dice[i]
        if (frame.opacity <= 0) return
        const rest = tileSide * frame.size
        // Motion streak: fading ghosts along the recent path.
        if (frame.inFlight && !plan.reduceMotion) {
          for (let k = 1; k <= 3; k += 1) {
            const past = dieFrameAt(plan, die, t - 0.024 * k)
            if (past.opacity <= 0) continue
            const side = tileSide * past.size * (1 + dieHeightScale * past.height)
            const at = toLayer(past.center.x, past.center.y)
            rotatedSquare(ctx, at.x, at.y, side, past.rotZ, withAlpha(skin.glow ?? skin.faceTop, (0.16 / k) * past.opacity), side * 0.08)
          }
        }
        // Soft contact shadow; it drifts away and blurs as the die rises.
        const h = frame.height
        const shadowAlpha = (0.5 / (1 + 1.3 * h)) * frame.opacity * (1 - frame.tileBlend)
        if (shadowAlpha > 0.01) {
          const at = toLayer(frame.center.x, frame.center.y)
          rotatedSquare(
            ctx,
            at.x + 0.2 * h * rest,
            at.y + 0.45 * h * rest + rest * 0.06,
            rest * 0.95,
            frame.rotZ,
            withAlpha(black, shadowAlpha),
            rest * (0.07 + 0.16 * h),
          )
        }
        // Landing ring.
        if (frame.impact > 0) {
          const p = frame.impact
          const at = toLayer(die.landing.x, die.landing.y)
          ctx.beginPath()
          ctx.arc(at.x, at.y, rest * (0.6 + 0.6 * p), 0, Math.PI * 2)
          ctx.lineWidth = rest * 0.07 * (1 - p)
          ctx.strokeStyle = css(withAlpha(skin.rim, 0.38 * (1 - p) ** 1.5))
          ctx.stroke()
        }
      })
    }

    const placeDie = (die: DieSpec, frame: DieFrame, i: number, keys: string[]) => {
      const node = dieRefs.current[i]
      const tile = tileRefs.current[i]
      const at = toLayer(frame.center.x, frame.center.y)
      if (tile) {
        tile.style.opacity = String(Math.min(1, Math.max(0, frame.tileBlend * 2)))
        tile.style.transform = `translate(${at.x - cell / 2}px, ${at.y - cell / 2}px)`
      }
      if (!node) return
      const alpha = frame.opacity * (1 - frame.tileBlend)
      if (alpha <= 0 || frame.tileBlend >= 1) {
        node.style.visibility = 'hidden'
        return
      }
      node.style.visibility = 'visible'
      node.style.opacity = String(alpha)
      const side = tileSide * frame.size * (1 + dieHeightScale * frame.height)
      const faces = visibleFaces(frame)
      const labels = dieFaceCells(die).map(cellLabel)
      const shown = new Set(faces.map((face) => face.face))
      faceRefs.current[i]?.forEach((canvas, face) => {
        if (canvas && !shown.has(face)) canvas.style.display = 'none'
      })
      faces.forEach((face, order) => {
        const canvas = faceRefs.current[i]?.[face.face]
        if (!canvas) return
        canvas.style.display = 'block'
        canvas.style.zIndex = String(order + 1)
        canvas.style.transform = faceCssMatrix(face, at.x, at.y, side)
        const key = `${Math.round(face.shade * 60)}`
        if (keys[face.face] !== key) {
          keys[face.face] = key
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.setTransform(faceBitmap / 100, 0, 0, faceBitmap / 100, faceBitmap / 2, faceBitmap / 2)
            paintDieFace(ctx, labels[face.face], face.shade, skin)
          }
        }
      })
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [plan, skin, grid.left, grid.top, cell, startedAt, faceBitmap, pixelRatio, onFinished])

  return (
    <div
      ref={root}
      className="dice-roll-layer"
      onPointerDown={(event) => {
        event.preventDefault()
        onSkip()
      }}
      aria-hidden="true"
    >
      {plan.dice.map((_die, i) => (
        <canvas
          key={`tile-${i}`}
          ref={(node) => { tileRefs.current[i] = node }}
          className="roll-tile"
          style={{ width: cell + Math.ceil(cell * 0.4) * 2, height: cell + Math.ceil(cell * 0.4) * 2, margin: -Math.ceil(cell * 0.4), opacity: 0 }}
        />
      ))}
      <canvas ref={effects} className="roll-effects" />
      {plan.dice.map((_die, i) => (
        <div key={`die-${i}`} ref={(node) => { dieRefs.current[i] = node }} className="roll-die3d" style={{ visibility: 'hidden' }}>
          {Array.from({ length: 6 }, (_, face) => (
            <canvas
              key={face}
              ref={(node) => {
                faceRefs.current[i] ??= []
                faceRefs.current[i][face] = node
              }}
              width={faceBitmap}
              height={faceBitmap}
              className="roll-face"
              style={{ display: 'none' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function rotatedSquare(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  side: number,
  angle: number,
  color: Rgba,
  sigma: number,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  const path = roundedRect({ left: -side / 2, top: -side / 2, right: side / 2, bottom: side / 2 }, side * 0.17)
  blurred(ctx, sigma, color, (c) => c.fill(path))
  ctx.restore()
}
