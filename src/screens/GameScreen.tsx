import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { gameAudio } from '../audio/audioService'
import { PieceSvg } from '../components/PieceSvg'
import { themeStyle, type ThemePreset } from '../cosmetics/themes'
import type { AppCopy } from '../i18n/translations'
import { applyReferenceSolution, flipPiece, initialSnapshot, isSolved, orientationOf, placePiece, removePiece, rotatePiece } from '../game/controller'
import { cellKey, cellLabel } from '../game/cells'
import { sampleLevel } from '../game/pieces'
import { shapeBounds, transformCells } from '../game/transforms'
import type { Cell, GameSnapshot } from '../game/types'

interface DragState {
  pieceId: string
  grabXRatio: number
  grabYRatio: number
  clientX: number
  clientY: number
}

interface PendingTrayPress {
  pieceId: string
  pointerId: number
  clientX: number
  clientY: number
  rect: DOMRect
  timer: number
  started: boolean
}

export function GameScreen({ theme, text, onBack }: { theme: ThemePreset; text: AppCopy; onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => initialSnapshot(sampleLevel))
  const [selected, setSelected] = useState(sampleLevel.pieces[0].id)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [turnAnimation, setTurnAnimation] = useState({ pieceId: '', nonce: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nextPoint = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number | null>(null)
  const pendingTrayPress = useRef<PendingTrayPress | null>(null)
  const suppressClickUntil = useRef(0)
  const solvedBefore = useRef(false)
  const solved = isSolved(snapshot)
  const blocked = useMemo(() => new Map(sampleLevel.blockedCells.map((cell) => [cellKey(cell), cell])), [])
  const selectedPiece = sampleLevel.pieces.find((piece) => piece.id === selected) ?? sampleLevel.pieces[0]

  useEffect(() => {
    if (solved && !solvedBefore.current) gameAudio.playEffect('complete')
    solvedBefore.current = solved
  }, [solved])

  useEffect(() => () => {
    if (pendingTrayPress.current) window.clearTimeout(pendingTrayPress.current.timer)
  }, [])

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

  const startDrag = useCallback((pieceId: string, clientX: number, clientY: number, rect: DOMRect, centerOnPointer = false) => {
    const current = {
      pieceId,
      grabXRatio: centerOnPointer ? .5 : Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      grabYRatio: centerOnPointer ? .5 : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      clientX,
      clientY,
    }
    nextPoint.current = { x: clientX, y: clientY }
    setDrag(current)
    gameAudio.playEffect('pickup')
  }, [])

  const beginBoardDrag = (pieceId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setSelected(pieceId)
    startDrag(pieceId, event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
  }

  const beginTrayPress = (pieceId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setSelected(pieceId)
    event.currentTarget.setPointerCapture(event.pointerId)
    const press: PendingTrayPress = {
      pieceId,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      timer: 0,
      started: false,
    }
    press.timer = window.setTimeout(() => {
      if (pendingTrayPress.current !== press) return
      press.started = true
      suppressClickUntil.current = Date.now() + 650
      startDrag(press.pieceId, press.clientX, press.clientY, press.rect, true)
    }, 190)
    pendingTrayPress.current = press
  }

  const moveTrayPress = (event: ReactPointerEvent<HTMLElement>) => {
    const press = pendingTrayPress.current
    if (!press || press.pointerId !== event.pointerId) return
    press.clientX = event.clientX
    press.clientY = event.clientY
  }

  const endTrayPress = (event: ReactPointerEvent<HTMLElement>) => {
    const press = pendingTrayPress.current
    if (!press || press.pointerId !== event.pointerId) return
    window.clearTimeout(press.timer)
    pendingTrayPress.current = null
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
          const withinDropArea = event.clientX >= board.left && event.clientX <= board.right && event.clientY >= board.top && event.clientY <= board.bottom
          if (withinDropArea) {
            setSnapshot((current) => {
              const next = placePiece(current, drag.pieceId, origin)
              gameAudio.playEffect(next === current ? 'reject' : 'place')
              return next
            })
          } else if (snapshot.placements[drag.pieceId]) {
            setSnapshot((current) => removePiece(current, drag.pieceId))
            gameAudio.playEffect('place')
          } else {
            gameAudio.playEffect('reject')
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

  const rotate = (pieceId: string) => {
    setTurnAnimation((current) => ({ pieceId, nonce: current.nonce + 1 }))
    setSnapshot((current) => rotatePiece(current, pieceId))
    gameAudio.playEffect('turn')
  }

  const dragPiece = drag ? sampleLevel.pieces.find((piece) => piece.id === drag.pieceId) : null
  const dragShape = dragPiece ? transformCells(dragPiece.cells, orientationOf(snapshot, dragPiece.id)) : null

  return (
    <main className={`game-screen dice-${theme.dice.surface}`} style={themeStyle(theme)}>
      <header className="game-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label={text.back}>←</button>
        <div><span className="eyebrow">QYBEQ</span><h1>{text.fillEveryCell}</h1></div>
        <div className="timer" aria-label={text.elapsedTime}>00:00</div>
      </header>

      <section className="game-layout" aria-label="Puzzle">
        <div className="board-wrap">
          <div className="board">
            <div className="board-grid">
              {Array.from({ length: 36 }, (_, index) => {
                const cell = { row: Math.floor(index / 6), col: index % 6 }
                const blockedCell = blocked.get(cellKey(cell))
                return <div className={blockedCell ? 'board-cell blocked' : 'board-cell'} key={cellKey(cell)}>{blockedCell && <span>{cellLabel(blockedCell)}</span>}</div>
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
                    onPointerDown={(event) => beginBoardDrag(placement.pieceId, event)}
                    onClick={() => setSelected(placement.pieceId)}
                    aria-label={`${piece.name} piece`}
                  ><PieceSvg cells={cells} color={theme.pieceColors[placement.pieceId]} material={theme.material} /></button>
                )
              })}
            </div>
          </div>
          <div className="progress-row"><span>{text.placed(Object.keys(snapshot.placements).length)}</span><button type="button" className="hint-button">♢ <b>3</b></button></div>
        </div>

        <aside className="tray-panel">
          <div className="piece-controls">
            <button type="button" onClick={() => rotate(selected)}>↻ {text.rotate}</button>
            <button type="button" disabled={!selectedPiece.allowMirror} onClick={() => {
              setSnapshot((current) => flipPiece(current, selected))
              gameAudio.playEffect('turn')
            }}>⇋ {text.flip}</button>
          </div>
          <div className="piece-tray" aria-label="Pieces">
            {sampleLevel.pieces.filter((piece) => !snapshot.placements[piece.id]).map((piece) => {
              const shape = transformCells(piece.cells, orientationOf(snapshot, piece.id))
              const bounds = shapeBounds(shape)
              return (
                <button
                  type="button"
                  className={`tray-piece${selected === piece.id ? ' selected' : ''}${drag?.pieceId === piece.id ? ' dragging-source' : ''}`}
                  key={piece.id}
                  onClick={() => {
                    if (Date.now() < suppressClickUntil.current) {
                      suppressClickUntil.current = 0
                      return
                    }
                    setSelected(piece.id)
                    rotate(piece.id)
                  }}
                  aria-label={`${piece.name} piece`}
                >
                  <span
                    key={`${piece.id}:${turnAnimation.pieceId === piece.id ? turnAnimation.nonce : 0}`}
                    className={`tray-piece-art${turnAnimation.pieceId === piece.id ? ' turning' : ''}`}
                    style={{ '--piece-cols': bounds.cols, '--piece-rows': bounds.rows } as CSSProperties}
                    onPointerDown={(event) => beginTrayPress(piece.id, event)}
                    onPointerMove={moveTrayPress}
                    onPointerUp={endTrayPress}
                    onPointerCancel={endTrayPress}
                  >
                    <PieceSvg cells={shape} color={theme.pieceColors[piece.id]} material={theme.material} />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="debug-actions">
            <button type="button" onClick={() => setSnapshot(initialSnapshot(sampleLevel))}>{text.reset}</button>
            <button type="button" onClick={() => setSnapshot((current) => applyReferenceSolution(current))}>{text.previewSolution}</button>
          </div>
        </aside>
      </section>

      {solved && <div className="completion" role="dialog" aria-modal="true" aria-label={text.puzzleComplete}>
        <div className="completion-card"><span className="completion-mark">✓</span><h2>{text.puzzleComplete}</h2><p>{text.puzzleCompleteDescription}</p><button type="button" onClick={onBack}>{text.continue}</button></div>
      </div>}

      {drag && dragShape && createPortal(<div className="drag-overlay" ref={overlayRef} aria-hidden="true"><div className="drag-overlay-art"><PieceSvg cells={dragShape} color={theme.pieceColors[drag.pieceId]} material={theme.material} /></div></div>, document.body)}
    </main>
  )
}
