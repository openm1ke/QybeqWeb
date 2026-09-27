import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { trackGoal } from '../analytics/metrika'
import { gameAudio } from '../audio/audioService'
import { PieceSvg } from '../components/PieceSvg'
import { themeStyle, type ThemePreset } from '../cosmetics/themes'
import type { AppCopy } from '../i18n/translations'
import { flipPiece, initialSnapshot, isSolved, orientationOf, placePiece, removePiece, rotatePiece } from '../game/controller'
import { cellKey, cellLabel } from '../game/cells'
import { nextPlacementHint, placementMatches, type PlacementHint } from '../game/hints'
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

const diceLaunches = [
  { x: '-250%', y: '560%', midX: '-105%', midY: '150%', spin: '-620deg', delay: '0ms' },
  { x: '150%', y: '460%', midX: '90%', midY: '100%', spin: '570deg', delay: '75ms' },
  { x: '-150%', y: '360%', midX: '-65%', midY: '65%', spin: '-520deg', delay: '145ms' },
  { x: '50%', y: '260%', midX: '85%', midY: '28%', spin: '650deg', delay: '215ms' },
  { x: '150%', y: '160%', midX: '45%', midY: '-20%', spin: '-580deg', delay: '285ms' },
  { x: '-50%', y: '60%', midX: '-95%', midY: '-45%', spin: '540deg', delay: '355ms' },
] as const

export interface PuzzleCompletion {
  stars: number
  elapsedMs: number
  assistanceUsed: boolean
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function GameScreen({ theme, text, source, onComplete, onBack }: { theme: ThemePreset; text: AppCopy; source: 'new' | 'daily'; onComplete: (result: PuzzleCompletion) => void; onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => initialSnapshot(sampleLevel))
  const [phase, setPhase] = useState<'rolling' | 'play'>('rolling')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [earnedStars, setEarnedStars] = useState(0)
  const [selected, setSelected] = useState(sampleLevel.pieces[0].id)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [turnAnimation, setTurnAnimation] = useState({ pieceId: '', nonce: 0 })
  const [hint, setHint] = useState<PlacementHint | null>(null)
  const [hintsRemaining, setHintsRemaining] = useState(3)
  const [hintPulse, setHintPulse] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nextPoint = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number | null>(null)
  const pendingTrayPress = useRef<PendingTrayPress | null>(null)
  const suppressClickUntil = useRef(0)
  const solvedBefore = useRef(false)
  const rollFinished = useRef(false)
  const firstPlacementTracked = useRef(false)
  const startedAt = useRef<number | null>(null)
  const assistanceUsed = useRef(false)
  const completionReported = useRef(false)
  const solved = isSolved(snapshot)
  const blocked = useMemo(() => new Map(sampleLevel.blockedCells.map((cell) => [cellKey(cell), cell])), [])
  const selectedPiece = sampleLevel.pieces.find((piece) => piece.id === selected) ?? sampleLevel.pieces[0]
  const activeHint = hint && !placementMatches(snapshot, snapshot.placements[hint.pieceId], hint.target) ? hint : null
  const hintedPiece = activeHint ? sampleLevel.pieces.find((piece) => piece.id === activeHint.pieceId) : null
  const hintedShape = activeHint && hintedPiece ? transformCells(hintedPiece.cells, activeHint.target.orientation) : null
  const hintedBounds = hintedShape ? shapeBounds(hintedShape) : null

  const finishRoll = useCallback((skipped = false) => {
    if (rollFinished.current) return
    rollFinished.current = true
    startedAt.current = Date.now()
    setPhase('play')
    trackGoal('dice_roll_completed', { source, skipped })
    trackGoal('puzzle_started', { level_id: sampleLevel.id, source })
  }, [source])

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const timer = window.setTimeout(() => finishRoll(false), reducedMotion ? 360 : 1820)
    return () => window.clearTimeout(timer)
  }, [finishRoll])

  useEffect(() => {
    if (phase !== 'play' || solved) return
    const update = () => setElapsedSeconds(startedAt.current == null ? 0 : Math.floor((Date.now() - startedAt.current) / 1000))
    update()
    const timer = window.setInterval(update, 250)
    return () => window.clearInterval(timer)
  }, [phase, solved])

  useEffect(() => {
    if (solved && !solvedBefore.current && !completionReported.current) {
      completionReported.current = true
      const elapsedMs = startedAt.current == null ? 0 : Date.now() - startedAt.current
      const stars = assistanceUsed.current ? 1 : elapsedMs <= 60_000 ? 3 : 2
      setElapsedSeconds(Math.floor(elapsedMs / 1000))
      setEarnedStars(stars)
      gameAudio.playEffect('complete')
      trackGoal('puzzle_completed', { level_id: sampleLevel.id, source, placed_count: Object.keys(snapshot.placements).length, elapsed_ms: elapsedMs, stars, assistance_used: assistanceUsed.current })
      onComplete({ stars, elapsedMs, assistanceUsed: assistanceUsed.current })
    }
    solvedBefore.current = solved
  }, [onComplete, snapshot.placements, solved, source])

  useEffect(() => () => {
    if (pendingTrayPress.current) window.clearTimeout(pendingTrayPress.current.timer)
  }, [])

  const requestHint = () => {
    if (phase !== 'play' || solved) return
    if (activeHint) {
      setSelected(activeHint.pieceId)
      setHintPulse((value) => value + 1)
      gameAudio.playEffect('turn')
      return
    }
    if (hintsRemaining <= 0) return
    const next = nextPlacementHint(snapshot)
    if (!next) return
    assistanceUsed.current = true
    setHint(next)
    setHintsRemaining((value) => Math.max(0, value - 1))
    setSelected(next.pieceId)
    setHintPulse((value) => value + 1)
    gameAudio.playEffect('turn')
    trackGoal('hint_shown', { level_id: sampleLevel.id, source, piece_id: next.pieceId, kind: next.kind, hints_remaining: hintsRemaining - 1 })
  }

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
              if (next !== current && Object.keys(current.placements).length === 0 && !firstPlacementTracked.current) {
                firstPlacementTracked.current = true
                trackGoal('first_piece_placed', { level_id: sampleLevel.id, source, piece_id: drag.pieceId })
              }
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
  }, [drag, positionOverlay, snapshot, source])

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
        <div className="timer" aria-label={text.elapsedTime}>{formatClock(elapsedSeconds)}</div>
      </header>

      <section className="game-layout" aria-label="Puzzle">
        <div className="board-wrap">
          <div className="board">
            <div className="board-grid">
              {Array.from({ length: 36 }, (_, index) => {
                const cell = { row: Math.floor(index / 6), col: index % 6 }
                const blockedCell = blocked.get(cellKey(cell))
                const showBlocker = phase === 'play' && blockedCell
                return <div className={showBlocker ? 'board-cell blocked' : 'board-cell'} key={cellKey(cell)}>{showBlocker && <span>{cellLabel(showBlocker)}</span>}</div>
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
                    className={`board-piece${selected === placement.pieceId ? ' selected' : ''}${drag?.pieceId === placement.pieceId ? ' dragging-source' : ''}${activeHint?.kind === 'relocate' && activeHint.pieceId === placement.pieceId ? ' hint-source' : ''}`}
                    key={placement.pieceId}
                    style={{ left: `${placement.origin.col / 6 * 100}%`, top: `${placement.origin.row / 6 * 100}%`, width: `${bounds.cols / 6 * 100}%`, height: `${bounds.rows / 6 * 100}%` }}
                    onPointerDown={(event) => beginBoardDrag(placement.pieceId, event)}
                    onClick={() => setSelected(placement.pieceId)}
                    aria-label={`${piece.name} piece`}
                  ><PieceSvg cells={cells} color={theme.pieceColors[placement.pieceId]} material={theme.material} /></button>
                )
              })}
              {activeHint && hintedPiece && hintedShape && hintedBounds && <div
                key={`${activeHint.pieceId}:${hintPulse}`}
                className="hint-target"
                aria-hidden="true"
                style={{ left: `${activeHint.target.origin.col / 6 * 100}%`, top: `${activeHint.target.origin.row / 6 * 100}%`, width: `${hintedBounds.cols / 6 * 100}%`, height: `${hintedBounds.rows / 6 * 100}%` }}
              ><PieceSvg cells={hintedShape} color={theme.pieceColors[activeHint.pieceId]} material={theme.material} /></div>}
            </div>
            {phase === 'rolling' && <button className="dice-roll-layer" type="button" onClick={() => finishRoll(true)} aria-label={`${text.rollingDice} ${text.tapToSkip}`}>
              {sampleLevel.blockedCells.map((cell, index) => {
                const launch = diceLaunches[index]
                return <span
                  className="roll-die"
                  key={cellKey(cell)}
                  style={{
                    gridColumn: cell.col + 1,
                    gridRow: cell.row + 1,
                    '--roll-x': launch.x,
                    '--roll-y': launch.y,
                    '--roll-mid-x': launch.midX,
                    '--roll-mid-y': launch.midY,
                    '--roll-spin': launch.spin,
                    '--roll-delay': launch.delay,
                  } as CSSProperties}
                ><b>{cellLabel(cell)}</b></span>
              })}
            </button>}
          </div>
          <div className="progress-row"><span>{text.placed(Object.keys(snapshot.placements).length)}</span><button type="button" className={`hint-button${activeHint ? ' active' : ''}`} disabled={phase !== 'play' || solved || (!activeHint && hintsRemaining <= 0)} onClick={requestHint} aria-label={text.hintsLeft(hintsRemaining)}>♢ <b>{hintsRemaining}</b></button></div>
        </div>

        {phase === 'rolling' ? <aside className="tray-panel roll-status-panel" aria-live="polite">
          <div className="roll-status-card"><span className="dice-status-icon" aria-hidden="true">◇</span><div><span className="eyebrow">QYBEQ</span><h2>{text.rollingDice}</h2><p>{text.tapToSkip}</p></div></div>
        </aside> : <aside className="tray-panel">
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
            <button type="button" onClick={() => { setHint(null); setSnapshot(initialSnapshot(sampleLevel)) }}>{text.reset}</button>
          </div>
        </aside>}
      </section>

      {solved && earnedStars > 0 && <div className="completion" role="dialog" aria-modal="true" aria-label={text.puzzleComplete}>
        <div className="completion-card">
          <span className="completion-mark">✓</span>
          <h2>{text.puzzleComplete}</h2>
          <p>{text.puzzleCompleteDescription}</p>
          <div className="completion-stars" aria-label={text.resultStars(earnedStars)}>
            {Array.from({ length: 3 }, (_, index) => <span
              className={`completion-star${index < earnedStars ? ' earned' : ''}`}
              key={index}
              style={{ '--star-delay': `${420 + index * 320}ms` } as CSSProperties}
              aria-hidden="true"
            >
              <span className="completion-star-outline">☆</span>
              {index < earnedStars && <span className="completion-star-fill">★</span>}
            </span>)}
          </div>
          <p className="completion-result">{text.resultStars(earnedStars)}</p>
          <button type="button" onClick={onBack}>{text.continue}</button>
        </div>
      </div>}

      {drag && dragShape && createPortal(<div className="drag-overlay" ref={overlayRef} aria-hidden="true"><div className="drag-overlay-art"><PieceSvg cells={dragShape} color={theme.pieceColors[drag.pieceId]} material={theme.material} /></div></div>, document.body)}
    </main>
  )
}
