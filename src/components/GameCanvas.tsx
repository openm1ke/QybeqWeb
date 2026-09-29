import { memo, useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { BoardSkin, DiceSkin, PieceMaterial } from '../cosmetics/skins'
import type { Cell } from '../game/types'
import { shapeBounds } from '../game/transforms'
import type { Rgba } from '../rendering/color'
import { prepareCanvas } from '../rendering/canvas'
import { paintBlockedTile, paintDieIcon, paintWells } from '../rendering/boardPainter'
import { paintPiece, pieceOverflow, type PieceStyle } from '../rendering/piecePainter'
import { pieceBody } from '../rendering/pieceGeometry'

/**
 * Canvas-backed building blocks. Each one owns a box of exact logical size
 * (like its Flutter widget) and paints into a canvas that overflows the box
 * for shadows and glows, so layout never depends on the artwork.
 */

function usePixelRatio(): number {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
}

interface PieceArtProps {
  cells: readonly Cell[]
  color: Rgba
  material: PieceMaterial
  cellSize: number
  pieceStyle?: PieceStyle
  elevation?: number
  glow?: number
  highlight?: number
  tint?: Rgba | null
  conflicts?: readonly Cell[]
  /**
   * 0..1 white flash over the body (snap-in, solved wave). Drawn once on a
   * second canvas and faded with CSS, so animating it never repaints.
   */
  flash?: number
  className?: string
  style?: CSSProperties
}

export const PieceArt = memo(function PieceArt({
  cells,
  color,
  material,
  cellSize,
  pieceStyle = 'solid',
  elevation = 0,
  glow = 0,
  highlight = 0,
  tint = null,
  conflicts,
  flash = 0,
  className,
  style,
}: PieceArtProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLCanvasElement>(null)
  const hasFlash = flash > 0
  const pixelRatio = usePixelRatio()
  const bounds = shapeBounds(cells)
  const width = bounds.cols * cellSize
  const height = bounds.rows * cellSize
  const overflow = Math.ceil(cellSize * pieceOverflow(elevation, glow))
  const cellsKey = cells.map((cell) => `${cell.row}:${cell.col}`).join(',')
  const conflictKey = conflicts?.map((cell) => `${cell.row}:${cell.col}`).join(',') ?? ''

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, width, height, overflow, pixelRatio)
    if (!ctx) return
    paintPiece(ctx, { cells, color, material, cellSize, style: pieceStyle, elevation, glow, highlight, tint, conflicts })
    // cells/conflicts are compared by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsKey, conflictKey, color, material, cellSize, pieceStyle, elevation, glow, highlight, tint, width, height, overflow, pixelRatio])

  useLayoutEffect(() => {
    const canvas = flashRef.current
    if (!canvas || !hasFlash) return
    const ctx = prepareCanvas(canvas, width, height, 0, pixelRatio)
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fill(pieceBody(cells, cellSize).path)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsKey, cellSize, width, height, pixelRatio, hasFlash])

  return (
    <span className={['piece-art', className].filter(Boolean).join(' ')} style={{ width, height, ...style }} aria-hidden="true">
      <canvas
        ref={ref}
        style={{ position: 'absolute', left: -overflow, top: -overflow, width: width + overflow * 2, height: height + overflow * 2 }}
      />
      {hasFlash && <canvas ref={flashRef} style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: 0.35 * flash }} />}
    </span>
  )
})

export const BlockedTile = memo(function BlockedTile({ cellSize, label, skin, className, style }: {
  cellSize: number
  label: string
  skin: DiceSkin
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pixelRatio = usePixelRatio()
  const overflow = Math.ceil(cellSize * 0.4)
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, cellSize, cellSize, overflow, pixelRatio)
    if (ctx) paintBlockedTile(ctx, cellSize, label, skin)
  }, [cellSize, label, skin, overflow, pixelRatio])
  return (
    <span className={['tile-art', className].filter(Boolean).join(' ')} style={{ width: cellSize, height: cellSize, ...style }} role="img" aria-label={label}>
      <canvas ref={ref} style={{ position: 'absolute', left: -overflow, top: -overflow, width: cellSize + overflow * 2, height: cellSize + overflow * 2 }} />
    </span>
  )
})

export const Wells = memo(function Wells({ extent, boardSize, skin, hidden }: {
  extent: number
  boardSize: number
  skin: BoardSkin
  hidden: ReadonlySet<string>
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pixelRatio = usePixelRatio()
  const hiddenKey = [...hidden].sort().join(',')
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, extent, extent, 0, pixelRatio)
    if (ctx) paintWells(ctx, extent, boardSize, skin, hidden)
    // hidden is compared by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extent, boardSize, skin, hiddenKey, pixelRatio])
  return <canvas ref={ref} className="wells-art" style={{ width: extent, height: extent }} aria-hidden="true" />
})

export const DieIcon = memo(function DieIcon({ size, skin }: { size: number; skin: DiceSkin }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pixelRatio = usePixelRatio()
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = prepareCanvas(canvas, size, size, 0, pixelRatio)
    if (ctx) paintDieIcon(ctx, size, skin)
  }, [size, skin, pixelRatio])
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} aria-hidden="true" />
})
