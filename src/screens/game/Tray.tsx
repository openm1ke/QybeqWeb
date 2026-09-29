import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PieceArt } from '../../components/GameCanvas'
import { useAppearance } from '../../cosmetics/appearance'
import { pieceColor } from '../../cosmetics/skins'
import { curves } from '../../game/curves'
import { shapeBounds, transformCells } from '../../game/transforms'
import type { TrayLayout } from '../../game/trayLayout'
import type { Orientation, PieceDefinition } from '../../game/types'
import type { PieceEvent } from './Board'
import { shakeOffset } from './motion'
import { useAnimatedValue } from './useTween'

export interface TraySlotState {
  readonly piece: PieceDefinition
  readonly orientation: Orientation
  readonly placed: boolean
  /** 1 normally; faint while being dragged from the tray, 0 while flying home from the board. */
  readonly opacity: number
}

/**
 * Inventory of the pieces not on the board (mobile `PieceTray`). Every piece
 * keeps a fixed square slot, so placing or rotating one never moves others.
 */
export function Tray({
  layout,
  slots,
  selectedPieceId,
  interactive,
  reveal,
  reduceMotion,
  shake,
  onPointerDown,
  onKeyDown,
  onFocusPiece,
  label,
}: {
  layout: TrayLayout
  slots: readonly TraySlotState[]
  selectedPieceId: string | null
  interactive: boolean
  /** Entrance 0..1: pieces fade in and slide up with a short stagger. */
  reveal: number
  reduceMotion: boolean
  shake: PieceEvent | null
  onPointerDown: (pieceId: string, event: ReactPointerEvent<HTMLElement>) => void
  onKeyDown?: (pieceId: string, event: ReactKeyboardEvent<HTMLElement>) => void
  onFocusPiece?: (pieceId: string) => void
  label: (piece: PieceDefinition, orientation: Orientation) => string
}) {
  return (
    <div className="piece-tray" aria-label="Pieces" role="group">
      {slots.map((slot, i) => {
        const rect = layout.slots[i]
        if (!rect) return null
        const count = layout.slots.length
        const start = count <= 1 ? 0 : (0.4 * i) / (count - 1)
        const v = curves.easeOutCubic(Math.min(1, Math.max(0, (reveal - start) / 0.6)))
        const opacity = reduceMotion ? reveal : v
        const slide = reduceMotion ? 0 : (1 - v) * 16
        return (
          <div
            key={slot.piece.id}
            className="tray-slot"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.size,
              height: rect.size,
              opacity: opacity < 1 ? opacity : undefined,
              transform: slide ? `translateY(${slide}px)` : undefined,
            }}
          >
            {!slot.placed && (
              <TrayPiece
                slot={slot}
                cellSize={layout.cellSize}
                selected={slot.piece.id === selectedPieceId}
                interactive={interactive}
                reduceMotion={reduceMotion}
                shake={shake?.pieceId === slot.piece.id ? shake : null}
                label={label(slot.piece, slot.orientation)}
                onPointerDown={onPointerDown}
                onKeyDown={onKeyDown}
                onFocusPiece={onFocusPiece}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const TrayPiece = memo(function TrayPiece({ slot, cellSize, selected, interactive, reduceMotion, shake, label, onPointerDown, onKeyDown, onFocusPiece }: {
  slot: TraySlotState
  cellSize: number
  selected: boolean
  interactive: boolean
  reduceMotion: boolean
  shake: PieceEvent | null
  label: string
  onPointerDown: (pieceId: string, event: ReactPointerEvent<HTMLElement>) => void
  onKeyDown?: (pieceId: string, event: ReactKeyboardEvent<HTMLElement>) => void
  onFocusPiece?: (pieceId: string) => void
}) {
  const appearance = useAppearance()
  const shape = transformCells(slot.piece.cells, slot.orientation)
  const bounds = shapeBounds(shape)
  const [turn, setTurn] = useState(1)
  const [flip, setFlip] = useState(1)
  const [shakeT, setShakeT] = useState(1)
  const previous = useRef(slot.orientation)

  // The new shape is drawn at once and animated *from* the old pose.
  useLayoutEffect(() => {
    const before = previous.current
    previous.current = slot.orientation
    if (reduceMotion || (before.quarterTurns === slot.orientation.quarterTurns && before.mirrored === slot.orientation.mirrored)) return
    const flipped = before.mirrored !== slot.orientation.mirrored
    return run(flipped ? 280 : 220, flipped ? setFlip : setTurn)
  }, [slot.orientation, reduceMotion])

  useEffect(() => {
    if (!shake || reduceMotion) return
    return run(360, setShakeT)
  }, [shake, reduceMotion])

  const lifted = useAnimatedValue(selected ? 1 : 0, 160, curves.easeOut)
  const glow = useAnimatedValue(selected ? 1 : 0, 180)
  const turnEased = curves.easeOutBack(turn)
  const flipEased = curves.easeInOutCubic(flip)
  const transform = [
    `translateX(${shakeOffset(shakeT, cellSize)}px)`,
    'perspective(666.67px)',
    `rotateY(${180 * (1 - flipEased)}deg)`,
    `rotateZ(${-90 * (1 - turnEased)}deg)`,
    `translateY(${-0.03 * bounds.rows * cellSize * lifted}px)`,
    `scale(${1 + 0.06 * lifted})`,
  ].join(' ')

  return (
    <button
      type="button"
      className={`tray-piece${selected ? ' selected' : ''}`}
      disabled={!interactive}
      aria-label={label}
      aria-pressed={selected}
      data-piece={slot.piece.id}
      style={{ opacity: slot.opacity }}
      onPointerDown={(event) => onPointerDown(slot.piece.id, event)}
      onKeyDown={(event) => onKeyDown?.(slot.piece.id, event)}
      onFocus={() => onFocusPiece?.(slot.piece.id)}
    >
      <PieceArt
        cells={shape}
        color={pieceColor(appearance.pieces, slot.piece.id)}
        material={appearance.pieces.material}
        cellSize={cellSize}
        glow={glow}
        style={{ transform }}
      />
    </button>
  )
})

function run(durationMs: number, set: (value: number) => void): () => void {
  const start = performance.now()
  let frame = 0
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    set(t)
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  set(0)
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
