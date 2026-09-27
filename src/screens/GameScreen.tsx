import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { PieceSvg } from '../components/PieceSvg'
import {
  applyReferenceSolution,
  flipPiece,
  initialSnapshot,
  isSolved,
  orientationOf,
  placePiece,
  removePiece,
  rotatePiece,
} from '../game/controller'
import { cellKey, cellLabel } from '../game/cells'
import { sampleLevel } from '../game/pieces'
import { shapeBounds, transformCells } from '../game/transforms'
import type { Cell, GameSnapshot } from '../game/types'

const colors: Record<string, string> = {
  line4: '#38c9d4', elbow4: '#56cf95', tee: '#78a8f5', square: '#f4c735',
  zigzag: '#e95692', flare: '#9d71dd', elbow3: '#f28a4b', domino: '#9bc841',
}

interface DragState {
  pieceId: string
  grabXRatio: number
  grabYRatio: number
  clientX: number
  clientY: number
}

export function GameScreen({ onBack }: { onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => initialSnapshot(sampleLevel))
  const [selected, setSelected] = useState(sampleLevel.pieces[0].id)
  const [drag, setDrag] = useState<DragState | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nextPoint = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number | null>(null)
  const solved = isSolved(snapshot)
  const blocked = useMemo(() => new Map(sampleLevel.blockedCells.map((cell) => [cellKey(cell), cell])), [])
  const selectedPiece = sampleLevel.pieces.find((piece) => piece.id === selected) ?? sampleLevel.pieces[0]

  const positionOverlay = useCallback((current: DragState, x: number, y: number) => {
    const board = boardRef.current?.getBoundingClientRect()
    const node = overlayRef.current
    if (!board || !node) return
    const piece = sampleLevel.pieces.find((value) => value.id === current.pieceId)
    if (!piece) return
    const shape = transformCells(piece.cells, orientationOf(snapshot, current.pieceId))
    const bounds = shapeBounds(shape)
    const cellSize = board.width / sampleLevel.boardSize
    const left = x - current.grabXRatio * bounds.cols * cellSize
    const top = y - current.grabYRatio * bounds.rows * cellSize
    node.style.width = `${bounds.cols * cellSize}px`
    node.style.height = `${bounds.rows * cellSize}px`
    node.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }, [snapshot])

  const beginDrag = (pieceId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setSelected(pieceId)
    const rect = event.currentTarget.getBoundingClientRect()
    const current = {
      pieceId,
      grabXRatio: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      grabYRatio: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      clientX: event.clientX,
      clientY: event.clientY,
    }
    nextPoint.current = { x: event.clientX, y: event.clientY }
    setDrag(current)
  }

  useEffect(() => {
    if (!drag) return
    positionOverlay(drag, drag.clientX, drag.clientY)

    const move = (event: PointerEvent) => {
      nextPoint.current = { x: event.clientX, y: event.clientY }
      if (animationFrame.current != null) return
      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null
        positionOverlay(drag, nextPoint.current.x, nextPoint.current.y)
      })
    }

    const finish = (event: PointerEvent) => {
      const board = boardRef.current?.getBoundingClientRect()
      if (board) {
        const piece = sampleLevel.pieces.find((value) => value.id === drag.pieceId)
        if (piece) {
          const shape = transformCells(piece.cells, orientationOf(snapshot, drag.pieceId))
          const bounds = shapeBounds(shape)
          const cellSize = board.width / sampleLevel.boardSize
          const left = event.clientX - drag.grabXRatio * bounds.cols * cellSize
          const top = event.clientY - drag.grabYRatio * bounds.rows * cellSize
          const origin: Cell = {
            row: Math.floor((top - board.top + cellSize / 2) / cellSize),
            col: Math.floor((left - board.left + cellSize / 2) / cellSize),
          }
          const withinDropArea = event.clientX >= board.left && event.clientX <= board.right &&
            event.clientY >= board.top && event.clientY <= board.bottom
          if (withinDropArea) {
            setSnapshot((current) => placePiece(current, drag.pieceId, origin))
          } else if (snapshot.placements[drag.pieceId]) {
            setSnapshot((current) => removePiece(current, drag.pieceId))
          }
        }
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', finish, { once: true })
    window.addEventListener('pointercancel', finish, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      if (animationFrame.current != null) cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
  }, [drag, positionOverlay, snapshot])

  const dragPiece = drag ? sampleLevel.pieces.find((piece) => piece.id === drag.pieceId) : null
  const dragShape = dragPiece ? transformCells(dragPiece.cells, orientationOf(snapshot, dragPiece.id)) : null

  return (
    <main className="game-screen">
      <header className="game-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back">←</button>
        <div><span className="eyebrow">QYBEQ</span><h1>Fill every free cell</h1></div>
        <div className="timer" aria-label="Elapsed time">00:00</div>
      </header>

      <section className="game-layout" aria-label="Puzzle">
        <div className="board-wrap">
          <div className="board">
            <div className="board-grid">
              {Array.from({ length: 36 }, (_, index) => {
                const cell = { row: Math.floor(index / 6), col: index % 6 }
                const blockedCell = blocked.get(cellKey(cell))
                return <div className={blockedCell ? 'board-cell blocked' : 'board-cell'} key={cellKey(cell)}>
                  {blockedCell && <span>{cellLabel(blockedCell)}</span>}
                </div>
              })}
            </div>
            <div className="piece-layer" ref={boardRef}>
              {Object.values(snapshot.placements).map((placement) => {
              const piece = sampleLevel.pieces.find((value) => value.id === placement.pieceId)!
              const cells = transformCells(piece.cells, placement.orientation)
              const bounds = shapeBounds(cells)
              return (
                <button
                  type="button"
                  className={`board-piece${selected === placement.pieceId ? ' selected' : ''}${drag?.pieceId === placement.pieceId ? ' dragging-source' : ''}`}
                  key={placement.pieceId}
                  style={{ left: `${placement.origin.col / 6 * 100}%`, top: `${placement.origin.row / 6 * 100}%`, width: `${bounds.cols / 6 * 100}%`, height: `${bounds.rows / 6 * 100}%` }}
                  onPointerDown={(event) => beginDrag(placement.pieceId, event)}
                  onClick={() => setSelected(placement.pieceId)}
                  aria-label={`${piece.name} piece`}
                ><PieceSvg cells={cells} color={colors[placement.pieceId]} /></button>
              )
              })}
            </div>
          </div>
          <div className="progress-row"><span>{Object.keys(snapshot.placements).length} of 8 placed</span><button type="button" className="hint-button">♢ <b>3</b></button></div>
        </div>

        <aside className="tray-panel">
          <div className="piece-controls">
            <button type="button" onClick={() => setSnapshot((current) => rotatePiece(current, selected))}>↻ Rotate</button>
            <button type="button" disabled={!selectedPiece.allowMirror} onClick={() => setSnapshot((current) => flipPiece(current, selected))}>⇋ Flip</button>
          </div>
          <div className="piece-tray" aria-label="Pieces">
            {sampleLevel.pieces.filter((piece) => !snapshot.placements[piece.id]).map((piece) => {
              const shape = transformCells(piece.cells, orientationOf(snapshot, piece.id))
              const bounds = shapeBounds(shape)
              return (
                <button
                  type="button"
                  className={`tray-piece${selected === piece.id ? ' selected' : ''}`}
                  key={piece.id}
                  onClick={() => {
                    setSelected(piece.id)
                    setSnapshot((current) => rotatePiece(current, piece.id))
                  }}
                  aria-label={`${piece.name} piece`}
                >
                  <span
                    className="tray-piece-art"
                    style={{ '--piece-cols': bounds.cols, '--piece-rows': bounds.rows } as CSSProperties}
                    onPointerDown={(event) => beginDrag(piece.id, event)}
                  >
                    <PieceSvg cells={shape} color={colors[piece.id]} />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="debug-actions">
            <button type="button" onClick={() => setSnapshot(initialSnapshot(sampleLevel))}>Reset</button>
            <button type="button" onClick={() => setSnapshot((current) => applyReferenceSolution(current))}>Preview solution</button>
          </div>
        </aside>
      </section>

      {solved && <div className="completion" role="dialog" aria-modal="true" aria-label="Puzzle complete">
        <div className="completion-card"><span className="completion-mark">✓</span><h2>Puzzle complete</h2><p>The TypeScript engine validated every cell.</p><button type="button" onClick={onBack}>Continue</button></div>
      </div>}

      {drag && dragShape && createPortal(<div className="drag-overlay" ref={overlayRef} aria-hidden="true"><PieceSvg cells={dragShape} color={colors[drag.pieceId]} /></div>, document.body)}
    </main>
  )
}
