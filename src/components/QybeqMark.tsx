import { useLayoutEffect, useRef } from 'react'
import { brandDie, materials } from '../cosmetics/skins'
import { curves } from '../game/curves'
import { cellsFromPattern } from '../game/transforms'
import type { Cell } from '../game/types'
import { argb, black, css, white, withAlpha } from '../rendering/color'
import { fillPath, prepareCanvas, roundedRect, verticalGradient } from '../rendering/canvas'
import { cellInset } from '../rendering/boardPainter'
import { cellRadius } from '../rendering/pieceGeometry'
import { PieceArt } from './GameCanvas'

/**
 * The Qybeq mark (mobile `QybeqMark`): a Q assembled from game pieces on a
 * 5×5 grid, with a die as its tail. It keeps its own colours and the brand
 * material, so no skin ever changes it.
 */
interface MarkPart {
  cells: Cell[] | null
  at: Cell
  color?: ReturnType<typeof argb>
  from: [number, number]
  tilt: number
  delay: number
  nudge?: [number, number]
  restTilt?: number
  scale?: number
}

const parts: MarkPart[] = [
  { cells: cellsFromPattern('####'), at: { row: 0, col: 0 }, color: argb(0xff2fd4ee), from: [-0.4, -0.9], tilt: -0.1, delay: 0 },
  { cells: cellsFromPattern('#. / #. / ##'), at: { row: 1, col: 0 }, color: argb(0xff5b8cff), from: [-0.9, 0.5], tilt: 0.1, delay: 0.08 },
  { cells: cellsFromPattern('.# / .# / ##'), at: { row: 1, col: 2 }, color: argb(0xffa98bff), from: [0.9, 0.4], tilt: -0.08, delay: 0.16 },
  { cells: null, at: { row: 4, col: 4 }, nudge: [-0.42, -0.42], scale: 1.22, restTilt: -0.3, from: [0.5, 0.9], tilt: 0.5, delay: 0.28 },
]

const hollow: Cell[] = [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 2 }]

export function QybeqMark({ cellSize, progress = 1, reduceMotion = false }: { cellSize: number; progress?: number; reduceMotion?: boolean }) {
  const c = cellSize
  return (
    <div className="qybeq-mark" style={{ width: 5 * c, height: 5 * c }} aria-hidden="true">
      <FaintWells cellSize={c} strength={progress} />
      {parts.map((part, index) => {
        const t = Math.min(1, Math.max(0, (progress - part.delay) / 0.62))
        const settle = reduceMotion ? 1 : curves.easeOutBack(t)
        const turn = reduceMotion ? 1 : curves.easeOutCubic(t)
        const opacity = reduceMotion ? progress : curves.easeOut(Math.min(1, t * 2))
        const scale = part.scale ?? 1
        const grow = ((scale - 1) * c) / 2
        const [nx, ny] = part.nudge ?? [0, 0]
        const angle = (part.restTilt ?? 0) + part.tilt * (1 - turn)
        return (
          <div
            key={index}
            className="mark-part"
            style={{
              left: (part.at.col + nx) * c - grow,
              top: (part.at.row + ny) * c - grow,
              opacity,
              transform: `translate(${part.from[0] * c * (1 - settle)}px, ${part.from[1] * c * (1 - settle)}px) rotate(${angle}rad)`,
            }}
          >
            {part.cells
              ? <PieceArt cells={part.cells} color={part.color!} material={materials.brand} cellSize={c} />
              : <MarkDie size={c * scale} />}
          </div>
        )
      })}
    </div>
  )
}

/** The tail's die: one pip, in the blocked-tile style (`DieTilePainter`). */
function MarkDie({ size }: { size: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const overflow = Math.ceil(size * 0.3)
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, size, size, overflow)
    if (!ctx) return
    const c = size
    const rect = cellInset(0, 0, c)
    const radius = cellRadius(c)
    const base = roundedRect(rect, radius)
    fillPath(ctx, roundedRect({ ...rect, top: rect.top + c * 0.05, bottom: rect.bottom + c * 0.05 }, radius), withAlpha(black, 0.45), c * 0.05)
    fillPath(ctx, base, brandDie.side)
    const face = { ...rect, bottom: rect.bottom - c * 0.05 }
    ctx.fillStyle = verticalGradient(ctx, face, [brandDie.faceTop, brandDie.faceBottom])
    ctx.fill(roundedRect(face, radius))
    ctx.fillStyle = css(brandDie.pip)
    ctx.beginPath()
    ctx.arc((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - c * 0.025, c * 0.11, 0, Math.PI * 2)
    ctx.fill()
  }, [size, overflow])
  return (
    <span className="tile-art" style={{ width: size, height: size }}>
      <canvas ref={ref} style={{ position: 'absolute', left: -overflow, top: -overflow, width: size + overflow * 2, height: size + overflow * 2 }} />
    </span>
  )
}

/** Barely-there board wells in the ring's hollow. */
function FaintWells({ cellSize, strength }: { cellSize: number; strength: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, cellSize * 5, cellSize * 5, 0)
    if (!ctx) return
    for (const cell of hollow) {
      const well = roundedRect(cellInset(cell.col * cellSize, cell.row * cellSize, cellSize), cellRadius(cellSize))
      fillPath(ctx, well, withAlpha(black, 0.16 * strength))
      ctx.lineWidth = Math.min(2, Math.max(0.8, cellSize * 0.012))
      ctx.strokeStyle = css(withAlpha(white, 0.07 * strength))
      ctx.stroke(well)
    }
  }, [cellSize, strength])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: cellSize * 5, height: cellSize * 5 }} />
}
