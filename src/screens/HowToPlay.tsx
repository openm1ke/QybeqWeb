import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { PieceArt } from '../components/GameCanvas'
import { Icon } from '../components/Icon'
import { MiniBoard } from '../components/MiniBoard'
import { PrimaryAction, QuietAction, SecondaryAction } from '../components/ui'
import { useAppearance } from '../cosmetics/appearance'
import { pieceColor } from '../cosmetics/skins'
import { gameAudio } from '../audio/audioService'
import { candidateOrigin } from '../game/boardGeometry'
import { curves } from '../game/curves'
import { pieceById, sampleLevel } from '../game/pieces'
import { flipOrientationHorizontally, rotateOrientationClockwise, shapeBounds, transformCells } from '../game/transforms'
import type { Orientation, PieceDefinition } from '../game/types'
import type { AppCopy } from '../i18n/translations'
import { ScreenFrame } from './CustomizeScreen'
import { prefersReducedMotion } from './game/useTween'
import '../game.css'

/**
 * Six short lessons drawn with the real board and piece renderers (mobile
 * `HowToPlayScreen`). Every statement matches the engine: row dice, 30 free
 * cells, quarter turns, optional flip, no overlaps, solved when every free
 * cell is covered. Swipe, the arrow keys or the buttons move between lessons.
 */
export function HowToPlay({ text, onDone }: { text: AppCopy; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [area, setArea] = useState({ width: window.innerWidth, height: window.innerHeight - 140 })
  const pager = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ pointerId: number; x: number; y: number; active: boolean } | null>(null)
  const reduce = prefersReducedMotion()
  const lessons = text.lessons
  const last = index === lessons.length - 1

  useLayoutEffect(() => {
    const node = pager.current
    if (!node) return
    const update = () => setArea({ width: node.clientWidth, height: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const go = (next: number) => {
    if (next < 0) return
    if (next >= lessons.length) {
      onDone()
      return
    }
    setIndex(next)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'ArrowRight') go(index + 1)
      else if (event.key === 'ArrowLeft') go(index - 1)
      else if (event.key === 'Escape') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Horizontal swipes page like the mobile PageView; a demo that is dragged
  // itself marks its handle with data-no-swipe.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-no-swipe]')) return
    swipe.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    if (!s || s.pointerId !== event.pointerId) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y
    if (!s.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      s.active = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (s.active) setDrag((index === 0 && dx > 0) || (last && dx < 0) ? dx / 3 : dx)
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    if (!s || s.pointerId !== event.pointerId) return
    swipe.current = null
    if (!s.active) return
    const dx = event.clientX - s.x
    setDrag(0)
    if (dx < -area.width * 0.18 && !last) setIndex(index + 1)
    else if (dx > area.width * 0.18 && index > 0) setIndex(index - 1)
  }

  // The mobile _LessonView: a square illustration, at most 320 (400 on
  // tablets), never wider than the page or taller than half of it.
  const size = Math.max(120, Math.min(area.width >= 600 ? 400 : 320, area.width - 64, area.height * 0.5))
  const illustrations: ReactNode[] = [
    <MiniBoard key="board" extent={size} level={sampleLevel} />,
    <PieceSet key="pieces" width={size} />,
    <DemoPiece key="rotate" piece={pieceById('elbow4')} size={size} text={text} />,
    <DemoPiece key="flip" piece={pieceById('zigzag')} size={size} text={text} showFlip />,
    <PlaceDemo key="place" size={size} text={text} />,
    <MiniBoard key="fill" extent={size} level={sampleLevel} placed={sampleLevel.referenceSolution} />,
  ]

  return (
    <ScreenFrame
      title={text.howToPlayTitle}
      backLabel={text.back}
      onBack={onDone}
      trailing={<span className="caption lesson-counter" aria-label={text.stepOf(index + 1, lessons.length)}>{index + 1}/{lessons.length}</span>}
    >
      <div className="howto">
        <div
          ref={pager}
          className="howto-pager"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="howto-track"
            style={{
              transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
              transition: drag || reduce ? 'none' : 'transform 320ms cubic-bezier(0.215, 0.61, 0.355, 1)',
            }}
          >
            {lessons.map((lesson, i) => (
              <section key={lesson.title} className="lesson" aria-hidden={i !== index} inert={i !== index}>
                <div className="lesson-content">
                  <div className="lesson-art" style={{ minWidth: size, height: size }}>{illustrations[i]}</div>
                  <h2 className="lesson-title">{lesson.title}</h2>
                  <p className="lesson-body">{lesson.body}</p>
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="howto-controls">
          <QuietAction label={text.back} onPress={index === 0 ? undefined : () => go(index - 1)} style={{ width: 96 }} />
          <div className="lesson-dots" aria-hidden="true">
            {lessons.map((lesson, i) => <span key={lesson.title} className={i === index ? 'active' : ''} />)}
          </div>
          <PrimaryAction label={last ? text.done : text.next} compact onPress={() => go(index + 1)} style={{ width: 96 }} />
        </div>
      </div>
    </ScreenFrame>
  )
}

/** The eight pieces, as they appear in the tray. */
function PieceSet({ width }: { width: number }) {
  const appearance = useAppearance()
  const cell = width / 13
  return (
    <div className="piece-set" aria-hidden="true" style={{ gap: cell * 0.8 }}>
      {sampleLevel.pieces.map((piece) => (
        <PieceArt key={piece.id} cells={piece.cells} color={pieceColor(appearance.pieces, piece.id)} material={appearance.pieces.material} cellSize={cell} />
      ))}
    </div>
  )
}

/** A single piece that really rotates on tap (and flips, with showFlip). */
function DemoPiece({ piece, size, text, showFlip = false }: { piece: PieceDefinition; size: number; text: AppCopy; showFlip?: boolean }) {
  const appearance = useAppearance()
  const [orientation, setOrientation] = useState<Orientation>({ quarterTurns: 0, mirrored: false })
  const [turn, setTurn] = useState(1)
  const [flip, setFlip] = useState(1)
  const cell = size / 6

  const animate = (durationMs: number, set: (t: number) => void) => {
    if (prefersReducedMotion()) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      set(t)
      if (t < 1) requestAnimationFrame(tick)
    }
    set(0)
    requestAnimationFrame(tick)
  }
  const rotate = () => {
    setOrientation(rotateOrientationClockwise)
    animate(220, setTurn)
  }
  const mirror = () => {
    setOrientation(flipOrientationHorizontally)
    animate(280, setFlip)
  }

  // Matrix4..setEntry(3, 2, 0.0015)..rotateY(π(1 − flip))..rotateZ(−π/2 (1 − turn))
  const transform = `perspective(${1 / 0.0015}px) rotateY(${180 * (1 - curves.easeInOutCubic(flip))}deg) rotateZ(${-90 * (1 - curves.easeOutBack(turn))}deg)`
  return (
    <div className="demo-piece">
      <button
        type="button"
        className="demo-piece-button"
        aria-label={text.pieceTapRotate(text.pieceName(piece.id, piece.name))}
        data-orientation={orientation.quarterTurns}
        data-mirrored={orientation.mirrored}
        onClick={rotate}
        style={{ width: cell * 4, height: cell * 4 }}
      >
        <PieceArt
          cells={transformCells(piece.cells, orientation)}
          color={pieceColor(appearance.pieces, piece.id)}
          material={appearance.pieces.material}
          cellSize={cell}
          style={{ transform }}
        />
      </button>
      {showFlip && <SecondaryAction label={text.flip} icon="flipRounded" compact onPress={mirror} style={{ width: 132 }} />}
    </div>
  )
}

type Drag = { x: number; y: number; state: 'held' | 'returning' }

/**
 * Place: the board from the lesson with the line already down and the L's
 * outline. On the web the L beside it can be dragged: it snaps in on the
 * outline and flies back anywhere else (Enter or Space places it too).
 */
function PlaceDemo({ size, text }: { size: number; text: AppCopy }) {
  const appearance = useAppearance()
  const [done, setDone] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const grab = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null)
  const line = sampleLevel.referenceSolution[0]
  const target = sampleLevel.referenceSolution[2]
  const piece = pieceById(target.pieceId)
  const shape = transformCells(piece.cells, target.orientation)
  const bounds = shapeBounds(shape)
  const extent = Math.round(size * 0.76)
  const cell = (extent - Math.round(extent * 0.03) * 2 - 2) / 6

  const place = () => {
    setDrag(null)
    setDone(true)
    gameAudio.playEffect('place')
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (done || event.button !== 0) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    grab.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
    setDrag({ x: 0, y: 0, state: 'held' })
    gameAudio.playEffect('pickup')
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const g = grab.current
    if (!g || g.pointerId !== event.pointerId) return
    setDrag({ x: event.clientX - g.x, y: event.clientY - g.y, state: 'held' })
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const g = grab.current
    if (!g || g.pointerId !== event.pointerId) return
    grab.current = null
    const grid = gridRef.current?.getBoundingClientRect()
    const left = g.left + event.clientX - g.x
    const top = g.top + event.clientY - g.y
    const origin = grid ? candidateOrigin(left - grid.left, top - grid.top, bounds.rows, bounds.cols, grid.width / 6, 6) : null
    if (origin?.row === target.origin.row && origin.col === target.origin.col) {
      place()
    } else {
      setDrag({ x: 0, y: 0, state: 'returning' })
      gameAudio.playEffect('reject')
    }
  }

  return (
    <div className="place-demo">
      <div className="place-demo-row">
        <MiniBoard extent={extent} level={sampleLevel} placed={done ? [line, target] : [line]} ghost={done ? null : target} gridRef={gridRef} />
        <div className="place-demo-tray" style={{ width: bounds.cols * cell, height: bounds.rows * cell }}>
          {!done && (
            <button
              type="button"
              data-no-swipe
              className="place-demo-piece"
              aria-label={text.dragOntoOutline}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                place()
              }}
              onTransitionEnd={() => setDrag((value) => (value?.state === 'returning' ? null : value))}
              style={{
                transform: drag ? `translate(${drag.x}px, ${drag.y}px)` : undefined,
                transition: drag?.state === 'returning' ? 'transform 240ms cubic-bezier(0.215, 0.61, 0.355, 1)' : 'none',
                zIndex: drag ? 5 : undefined,
              }}
            >
              <PieceArt
                cells={shape}
                color={pieceColor(appearance.pieces, piece.id)}
                material={appearance.pieces.material}
                cellSize={cell}
                elevation={drag?.state === 'held' ? 1 : 0}
              />
            </button>
          )}
        </div>
      </div>
      <p className={`caption place-demo-caption${done ? ' done' : ''}`} role="status">
        {done ? <><Icon name="checkCircleRounded" size={16} color="#6CF2D2" /> {text.placedGreat}</> : text.dragOntoOutline}
      </p>
    </div>
  )
}
