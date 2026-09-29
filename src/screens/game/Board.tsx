import { memo, useEffect, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import { BlockedTile, PieceArt, Wells } from '../../components/GameCanvas'
import { useAppearance } from '../../cosmetics/appearance'
import { pieceColor, type BoardSkin } from '../../cosmetics/skins'
import { cellKey, cellLabel } from '../../game/cells'
import { curves } from '../../game/curves'
import { shapeBounds } from '../../game/transforms'
import type { Cell } from '../../game/types'
import { css, withAlpha } from '../../rendering/color'
import { blurRadiusToSigma } from '../../rendering/boardPainter'
import { cellGap, cellRadius } from '../../rendering/pieceGeometry'
import { liftedScale, shakeDurationMs, shakeOffset, snapDurationMs } from './motion'
import { invalidColor } from '../../rendering/piecePainter'
import { useProgress } from './useTween'

export interface BoardPiece {
  readonly pieceId: string
  readonly shape: readonly Cell[]
  readonly origin: Cell
}

export interface PieceEvent {
  readonly pieceId: string
  readonly nonce: number
  /** Snap: floating centre minus final centre, in px. */
  readonly offset?: { x: number; y: number }
}

export interface GhostPreview {
  readonly pieceId: string
  readonly shape: readonly Cell[]
  readonly origin: Cell
  readonly valid: boolean
  readonly conflicts: readonly Cell[]
}

export interface HintMarker {
  readonly pieceId: string
  readonly target: BoardPiece | null
  readonly source: BoardPiece | null
  /** Identity of the hint; a new key replays the entrance pulse. */
  readonly key: string
  /** Changes when the player asks again for the hint already shown. */
  readonly nonce: number
}

/** Frame, wells, dice tiles, pieces, drop preview, hint and effects. */
export function Board({
  extent,
  framePadding,
  blocked,
  showBlocked,
  pieces,
  hiddenWells,
  draggedPieceId,
  snap,
  shake,
  ghost,
  lifted = null,
  hint,
  reject,
  solved,
  celebration,
  reduceMotion,
  gridRef,
  label,
  onGridPointerDown,
  interactive = false,
  pieceLabel,
  onPieceKeyDown,
}: {
  extent: number
  framePadding: number
  blocked: readonly Cell[]
  showBlocked: boolean
  pieces: readonly BoardPiece[]
  hiddenWells: ReadonlySet<string>
  draggedPieceId: string | null
  snap: PieceEvent | null
  shake: PieceEvent | null
  ghost: GhostPreview | null
  /** A piece held with the keyboard: drawn lifted over its landing spot. */
  lifted?: GhostPreview | null
  hint: HintMarker | null
  reject: { cells: readonly Cell[]; nonce: number } | null
  solved: boolean
  /** Completion animation 0..1, or null when not celebrating. */
  celebration: number | null
  reduceMotion: boolean
  gridRef: Ref<HTMLDivElement>
  label: string
  onGridPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** Whether placed pieces take keyboard focus. */
  interactive?: boolean
  pieceLabel?: (pieceId: string, origin: Cell) => string
  onPieceKeyDown?: (pieceId: string, event: ReactKeyboardEvent<HTMLElement>) => void
}) {
  const appearance = useAppearance()
  const skin = appearance.board
  // Like a Flutter Container, the 1 px border adds to the frame padding.
  const gridSize = extent - 2 * framePadding - 2
  const cellSize = gridSize / 6
  const order = [...pieces].sort((a, b) => a.origin.row - b.origin.row || a.origin.col - b.origin.col)
  return (
    <div className="board-frame" role="img" aria-label={label} style={frameStyle(skin, extent, framePadding, solved, reduceMotion)}>
      <div ref={gridRef} className="board-grid" style={{ width: gridSize, height: gridSize }} onPointerDown={onGridPointerDown}>
        <Wells extent={gridSize} boardSize={6} skin={skin} hidden={hiddenWells} />
        {showBlocked && blocked.map((cell) => (
          <BlockedTile
            key={cellKey(cell)}
            className="board-tile"
            cellSize={cellSize}
            label={cellLabel(cell)}
            skin={appearance.dice}
            style={{ position: 'absolute', left: cell.col * cellSize, top: cell.row * cellSize }}
          />
        ))}
        {pieces.map((piece) => (
          <PlacedPiece
            key={piece.pieceId}
            piece={piece}
            cellSize={cellSize}
            hidden={piece.pieceId === draggedPieceId}
            snap={snap?.pieceId === piece.pieceId ? snap : null}
            shake={shake?.pieceId === piece.pieceId ? shake : null}
            reduceMotion={reduceMotion}
            wave={celebration == null || reduceMotion ? 0 : wave(celebration, order.indexOf(piece))}
          />
        ))}
        {ghost && (
          <PieceArt
            className="board-layer"
            cells={ghost.shape}
            color={pieceColor(appearance.pieces, ghost.pieceId)}
            material={appearance.pieces.material}
            cellSize={cellSize}
            pieceStyle={ghost.valid ? 'ghostValid' : 'ghostInvalid'}
            conflicts={ghost.conflicts}
            style={{ position: 'absolute', left: ghost.origin.col * cellSize, top: ghost.origin.row * cellSize, pointerEvents: 'none' }}
          />
        )}
        {lifted && (
          <PieceArt
            className="board-layer"
            cells={lifted.shape}
            color={pieceColor(appearance.pieces, lifted.pieceId)}
            material={appearance.pieces.material}
            cellSize={cellSize}
            elevation={1}
            tint={lifted.valid ? null : { ...invalidColor, a: 0.42 }}
            style={{ position: 'absolute', left: lifted.origin.col * cellSize, top: lifted.origin.row * cellSize, opacity: 0.72, transform: `scale(${liftedScale})`, pointerEvents: 'none' }}
          />
        )}
        <HintLayer hint={hint} cellSize={cellSize} reduceMotion={reduceMotion} />
        {/* Keyboard handles for placed pieces; pointer input goes to the grid. */}
        {pieces.map((piece) => {
          const b = shapeBounds(piece.shape)
          return (
            <button
              key={`focus-${piece.pieceId}`}
              type="button"
              className="board-piece-focus"
              data-board-piece={piece.pieceId}
              tabIndex={interactive ? 0 : -1}
              aria-label={pieceLabel?.(piece.pieceId, piece.origin) ?? piece.pieceId}
              onKeyDown={(event) => onPieceKeyDown?.(piece.pieceId, event)}
              style={{ left: piece.origin.col * cellSize, top: piece.origin.row * cellSize, width: b.cols * cellSize, height: b.rows * cellSize, borderRadius: cellRadius(cellSize) }}
            />
          )
        })}
        {reject && <RejectFlash key={reject.nonce} cells={reject.cells} cellSize={cellSize} reduceMotion={reduceMotion} />}
        {!reduceMotion && celebration != null && celebration > 0 && celebration < 1 && <SolvedSweep t={celebration} radius={extent * 0.03} />}
      </div>
    </div>
  )
}

function frameStyle(skin: BoardSkin, extent: number, padding: number, solved: boolean, reduceMotion: boolean): CSSProperties {
  const success = { r: 108 / 255, g: 242 / 255, b: 210 / 255, a: 1 }
  const shadowSigma = blurRadiusToSigma(36)
  const glowSigma = blurRadiusToSigma(44)
  const frameGlowSigma = blurRadiusToSigma(28)
  const shadows = [
    `0 18px ${2 * shadowSigma}px ${css(withAlpha(skin.shadow, skin.shadow.a * 0.55))}`,
    `0 0 ${2 * glowSigma}px 2px ${css(withAlpha(success, solved ? 0.32 : 0))}`,
  ]
  if (skin.frameGlow) shadows.push(`0 0 ${2 * frameGlowSigma}px ${css(skin.frameGlow)}`)
  return {
    width: extent,
    height: extent,
    padding,
    borderRadius: extent * 0.05,
    backgroundImage: `linear-gradient(180deg, ${css(skin.frameTop)}, ${css(skin.frameBottom)})`,
    border: `1px solid ${solved ? css(withAlpha(success, 0.55)) : css(skin.frameEdge)}`,
    boxShadow: shadows.join(', '),
    transitionDuration: reduceMotion ? '200ms' : '600ms',
  }
}

/** A soft pulse that travels through the pieces one after another. */
function wave(celebration: number, order: number): number {
  const x = (celebration - 0.12 - order * 0.06) / 0.3
  if (x <= 0 || x >= 1) return 0
  return 0.5 * Math.sin(Math.PI * x)
}

/** A piece on the board: snap-in (1.03 → 1, sliding home) and the reject shake. */
const PlacedPiece = memo(function PlacedPiece({ piece, cellSize, hidden, snap, shake, reduceMotion, wave }: {
  piece: BoardPiece
  cellSize: number
  hidden: boolean
  snap: PieceEvent | null
  shake: PieceEvent | null
  reduceMotion: boolean
  wave: number
}) {
  const appearance = useAppearance()
  const snapT = useProgress(snap?.nonce ?? null, snapDurationMs)
  const shakeT = useProgress(reduceMotion ? null : (shake?.nonce ?? null), shakeDurationMs)
  if (hidden) return null
  const t = curves.easeOutCubic(snapT)
  const offset = snap?.offset && !reduceMotion ? snap.offset : { x: 0, y: 0 }
  const scale = reduceMotion ? 1 : liftedScale + (1 - liftedScale) * t
  const dx = offset.x * (1 - t) + shakeOffset(shakeT, cellSize)
  const dy = offset.y * (1 - t)
  const bounds = shapeBounds(piece.shape)
  return (
    <PieceArt
      className="board-layer placed-piece"
      cells={piece.shape}
      color={pieceColor(appearance.pieces, piece.pieceId)}
      material={appearance.pieces.material}
      cellSize={cellSize}
      flash={Math.max((1 - t) * 0.55 * (snap ? 1 : 0), wave)}
      style={{
        position: 'absolute',
        left: piece.origin.col * cellSize,
        top: piece.origin.row * cellSize,
        transform: dx || dy || scale !== 1 ? `translate(${dx}px, ${dy}px) scale(${scale})` : undefined,
        transformOrigin: `${(bounds.cols * cellSize) / 2}px ${(bounds.rows * cellSize) / 2}px`,
      }}
    />
  )
})

/**
 * The hint on screen: a dashed outline where the piece should go, a dashed
 * ring around a placed piece that has to move. It pulses a few times when it
 * appears (or when asked for again), then rests.
 */
function HintLayer({ hint, cellSize, reduceMotion }: { hint: HintMarker | null; cellSize: number; reduceMotion: boolean }) {
  const appearance = useAppearance()
  // What is drawn (kept while fading out) and how the last change looked.
  const [tracked, setTracked] = useState<{ hint: HintMarker | null; shown: HintMarker | null; event: 'enter' | 'nudge' | 'exit' | null; serial: number }>(
    { hint, shown: hint, event: null, serial: 0 },
  )
  if (tracked.hint !== hint) {
    const before = tracked.hint
    const event = hint && (!before || before.key !== hint.key) ? 'enter' : hint && before && hint.nonce !== before.nonce ? 'nudge' : !hint && before ? 'exit' : null
    setTracked({ hint, shown: hint ?? tracked.shown, event, serial: tracked.serial + (event ? 1 : 0) })
  }
  const [fade, setFade] = useState(hint ? 1 : 0)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const { event } = tracked
    if (!event) return
    let frame = 0
    const animate = (duration: number, step: (t: number) => void, done?: () => void) => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration)
        step(t)
        if (t < 1) frame = requestAnimationFrame(tick)
        else done?.()
      }
      frame = requestAnimationFrame(tick)
    }
    const emphasize = (cycles: number) => {
      if (reduceMotion) return
      // Forward and back: 700 ms per half cycle.
      animate(700 * cycles * 2, (t) => {
        const phase = (t * cycles * 2) % 2
        setPulse(t >= 1 ? 0 : phase <= 1 ? phase : 2 - phase)
      })
    }
    if (event === 'enter') {
      if (reduceMotion) animate(0, () => setFade(1))
      else {
        animate(220, (t) => setFade((f) => Math.max(f, t)))
        emphasize(3)
      }
    } else if (event === 'nudge') {
      emphasize(2)
    } else {
      animate(reduceMotion ? 0 : 220, (t) => setFade(1 - t), () => setTracked((current) => (current.hint ? current : { ...current, shown: null })))
    }
    return () => cancelAnimationFrame(frame)
    // Each change is played once, keyed by its serial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracked.serial, reduceMotion])

  const shown = tracked.shown
  if (!shown) return null
  const glow = 0.35 + 0.65 * curves.easeInOut(pulse)
  const color = pieceColor(appearance.pieces, shown.pieceId)
  return (
    <div className="board-layer hint-layer" style={{ opacity: fade }}>
      {shown.source && (
        <PieceArt
          cells={shown.source.shape}
          color={color}
          material={appearance.pieces.material}
          cellSize={cellSize}
          pieceStyle="hintSource"
          glow={glow}
          style={{ position: 'absolute', left: shown.source.origin.col * cellSize, top: shown.source.origin.row * cellSize }}
        />
      )}
      {shown.target && (
        <PieceArt
          cells={shown.target.shape}
          color={color}
          material={appearance.pieces.material}
          cellSize={cellSize}
          pieceStyle="hint"
          glow={glow}
          style={{ position: 'absolute', left: shown.target.origin.col * cellSize, top: shown.target.origin.row * cellSize }}
        />
      )}
    </div>
  )
}

/** Briefly marks the cells that made a drop illegal. */
function RejectFlash({ cells, cellSize, reduceMotion }: { cells: readonly Cell[]; cellSize: number; reduceMotion: boolean }) {
  const g = cellGap(cellSize) / 2
  return (
    <div className="board-layer reject-layer" style={{ animationDuration: reduceMotion ? '300ms' : '450ms' }}>
      {cells.filter((cell) => cell.row >= 0 && cell.col >= 0 && cell.row < 6 && cell.col < 6).map((cell) => (
        <span
          key={cellKey(cell)}
          className="reject-cell"
          style={{
            left: cell.col * cellSize + g,
            top: cell.row * cellSize + g,
            width: cellSize - 2 * g,
            height: cellSize - 2 * g,
            borderRadius: cellRadius(cellSize),
            borderWidth: Math.min(3, Math.max(1.2, cellSize * 0.035)),
          }}
        />
      ))}
    </div>
  )
}

/** A band of light that crosses the board once when the puzzle is solved. */
function SolvedSweep({ t, radius }: { t: number; radius: number }) {
  const center = -0.3 + 1.6 * curves.easeInOutCubic(t)
  const stop = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`
  return (
    <div
      className="board-layer solved-sweep"
      style={{
        borderRadius: radius,
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0) ${stop(center - 0.18)}, rgba(255,255,255,.32) ${stop(center)}, rgba(255,255,255,0) ${stop(center + 0.18)})`,
      }}
    />
  )
}
