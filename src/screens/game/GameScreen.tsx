import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { trackGoal } from '../../analytics/metrika'
import { gameAudio } from '../../audio/audioService'
import { Icon } from '../../components/Icon'
import { PieceArt } from '../../components/GameCanvas'
import { PrimaryAction, RollDiceButton, SecondaryAction, Sheet } from '../../components/ui'
import { useAppearance } from '../../cosmetics/appearance'
import { pieceColor } from '../../cosmetics/skins'
import { candidateOrigin } from '../../game/boardGeometry'
import { cellKey, cellLabel } from '../../game/cells'
import { absoluteCells, applyReferenceSolution, checkPlacement, flipPiece, initialSnapshot, isSolved, orientationOf, placePiece, removePiece, rotatePiece } from '../../game/controller'
import { curves } from '../../game/curves'
import { dailySeed, StableRandom } from '../../game/daily'
import { rollNewPuzzle } from '../../game/dice'
import { generateRollPlan, type DiceRollPlan } from '../../game/diceRoll'
import { nextPlacementHint, placementMatches, type PlacementHint } from '../../game/hints'
import { pieces as allPieces } from '../../game/pieces'
import { browserRandom } from '../../game/random'
import { starsForAttempt } from '../../game/rewards'
import { clearSavedGame, loadSavedGame, saveGame, type RestoredGame } from '../../game/savedGame'
import { shapeBounds, transformCells } from '../../game/transforms'
import { computeTrayLayout, emptyTrayLayout, type TrayLayout } from '../../game/trayLayout'
import type { Cell, GameSnapshot, Placement, PuzzleLevel } from '../../game/types'
import type { AppCopy } from '../../i18n/translations'
import { invalidColor } from '../../rendering/piecePainter'
import { withAlpha } from '../../rendering/color'
import { Board, type BoardPiece, type GhostPreview, type HintMarker, type PieceEvent } from './Board'
import { liftedScale, shakeDurationMs, snapDurationMs } from './motion'
import { DiceRollLayer } from './DiceRollLayer'
import { headerHeight, resolveLayout, trayBarHeight } from './metrics'
import { Tray, type TraySlotState } from './Tray'
import { prefersReducedMotion } from './useTween'
import '../../game.css'

export interface PuzzleCompletion {
  stars: number
  elapsedMs: number
  assistanceUsed: boolean
}

export interface CompletionAward {
  attemptStars: number
  earnedDelta: number
  availableStars: number
}

type Phase = 'ready' | 'rolling' | 'play'
type Source = 'new' | 'daily'
type Rect = { left: number; top: number; width: number; height: number }

const emptyLevel: PuzzleLevel = { id: 'empty', boardSize: 6, blockedCells: [], pieces: allPieces, referenceSolution: [] }
const liftMs = 140
const returnMs = 240
/** Flutter's `kTouchSlop` for touch; mice start a drag sooner. */
const touchSlop = 18
const mouseSlop = 4
const holdToLiftMs = 300
const tipsKey = 'qybeq.tips.v1'

interface DragSession {
  pieceId: string
  source: 'tray' | 'board'
  sourceOrigin: Cell | null
  shape: Cell[]
  rows: number
  cols: number
  startRect: Rect
  anchor: { x: number; y: number }
  pointer: { x: number; y: number }
  startPointer: { x: number; y: number }
  candidate: Cell | null
  phase: 'dragging' | 'returning'
  liftStart: number
  returnFrom?: Rect
  returnTo?: Rect
  returnStart?: number
  shakeOnLanding?: boolean
}

/** Coarse drag state for rendering; the live position stays in a ref. */
interface ActiveDrag {
  pieceId: string
  source: 'tray' | 'board'
  phase: 'dragging' | 'returning'
  shape: Cell[]
}

/** A piece picked up with the keyboard, moved cell by cell over the board. */
interface KeyHold {
  pieceId: string
  source: 'tray' | 'board'
  origin: Cell
  /** Where a piece taken from the board goes back to on Escape. */
  restore: Placement | null
}

interface Gesture {
  pointerId: number
  pieceId: string
  source: 'tray' | 'board'
  down: { x: number; y: number }
  last: { x: number; y: number }
  slop: number
  started: boolean
  timer: number
}

function dailyLevel(): PuzzleLevel {
  return rollNewPuzzle(new StableRandom(dailySeed(new Date())), allPieces).level
}

function loadTips(): { rotate: boolean; place: boolean } {
  try {
    const value = JSON.parse(localStorage.getItem(tipsKey) ?? '{}') as Partial<Record<'rotate' | 'place', boolean>>
    return { rotate: value.rotate === true, place: value.place === true }
  } catch {
    return { rotate: false, place: false }
  }
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function GameScreen({ text, source: initialSource, resume = false, onComplete, onBack }: {
  text: AppCopy
  source: Source
  /** Continue the saved regular puzzle instead of waiting for a roll. */
  resume?: boolean
  onComplete: (result: PuzzleCompletion) => CompletionAward | null
  onBack: () => void
}) {
  const appearance = useAppearance()
  const reduceMotion = useMemo(() => prefersReducedMotion(), [])
  // A saved Daily for today, or the regular puzzle when continuing: straight
  // back into play, no second roll.
  const [restored] = useState<RestoredGame | null>(() => (initialSource === 'daily' ? loadSavedGame('daily') : resume ? loadSavedGame('new') : null))
  const startsInPlay = initialSource === 'daily' || restored != null
  const [source, setSource] = useState<Source>(initialSource)
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => restored?.snapshot ?? initialSnapshot(initialSource === 'daily' ? dailyLevel() : emptyLevel))
  const [phase, setPhase] = useState<Phase>(startsInPlay ? 'play' : 'ready')
  const [rollPlan, setRollPlan] = useState<{ plan: DiceRollPlan; startedAt: number; grid: { left: number; top: number; size: number } } | null>(null)
  const [reveal, setReveal] = useState(startsInPlay ? 1 : 0)
  const [selected, setSelected] = useState<string | null>(null)
  const [hint, setHint] = useState<PlacementHint | null>(null)
  const [hintNonce, setHintNonce] = useState(0)
  const [hintsRemaining, setHintsRemaining] = useState(restored?.hintsRemaining ?? 3)
  const [tips, setTips] = useState(loadTips)
  const [active, setActive] = useState<ActiveDrag | null>(null)
  const [ghost, setGhost] = useState<GhostPreview | null>(null)
  const [snap, setSnap] = useState<PieceEvent | null>(null)
  const [shake, setShake] = useState<PieceEvent | null>(null)
  const [reject, setReject] = useState<{ cells: Cell[]; nonce: number } | null>(null)
  const [settling, setSettling] = useState<ReadonlySet<string>>(new Set())
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [traySize, setTraySize] = useState({ width: 0, height: 0 })
  // Daily and continued puzzles are already rolled, so their clock runs at once.
  const [clock, setClock] = useState(() => ({ startedAt: startsInPlay ? Date.now() : null as number | null, banked: restored?.elapsedMs ?? 0, running: startsInPlay }))
  const [now, setNow] = useState(() => Date.now())
  const [celebration, setCelebration] = useState<number | null>(null)
  const [result, setResult] = useState<{ award: CompletionAward | null; elapsedMs: number; assistanceUsed: boolean } | null>(null)
  const [resultReady, setResultReady] = useState(false)
  const [viewingBoard, setViewingBoard] = useState(false)
  const [menu, setMenu] = useState<null | 'menu' | 'restart' | 'new'>(null)
  const [held, setHeld] = useState<KeyHold | null>(null)
  const [keyboardMode, setKeyboardMode] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const rollButtonRef = useRef<HTMLButtonElement>(null)
  const session = useRef<DragSession | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const snapshotRef = useRef(snapshot)
  useLayoutEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])
  const nonce = useRef(0)
  const assistanceUsed = useRef(restored?.assistanceUsed ?? false)
  const firstPlacementTracked = useRef(restored != null && Object.keys(restored.snapshot.placements).length > 0)
  const solvedBefore = useRef(false)

  const pixelRatio = window.devicePixelRatio || 1
  const layout = resolveLayout(size.width, size.height, pixelRatio)
  const cellSize = layout.cellSize
  const level = snapshot.level
  const solved = level !== emptyLevel && isSolved(snapshot)
  const interactive = phase === 'play' && !solved && menu == null

  // ---- Layout --------------------------------------------------------------

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const node = trayRef.current
    if (!node) return
    const update = () => setTraySize({ width: node.clientWidth, height: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const trayLayout: TrayLayout = useMemo(
    () => traySize.width > 0
      ? computeTrayLayout({
        spans: level.pieces.map((piece) => { const b = shapeBounds(piece.cells); return Math.max(b.rows, b.cols) }),
        width: traySize.width,
        height: traySize.height,
        maxCellSize: cellSize * 0.7,
      })
      : emptyTrayLayout,
    [level.pieces, traySize.width, traySize.height, cellSize],
  )

  // ---- Clock ---------------------------------------------------------------

  const elapsedMs = clock.banked + (clock.running && clock.startedAt != null ? now - clock.startedAt : 0)
  const clockStarted = clock.running || clock.banked > 0

  useEffect(() => {
    if (!clock.running) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [clock.running])

  const startClock = useCallback(() => {
    const at = Date.now()
    setNow(at)
    setClock({ startedAt: at, banked: 0, running: true })
  }, [])
  const pauseClock = useCallback(() => {
    setClock((c) => (c.running && c.startedAt != null ? { startedAt: null, banked: c.banked + Date.now() - c.startedAt, running: false } : c))
  }, [])
  const resumeClock = useCallback(() => {
    setClock((c) => (!c.running && (c.banked > 0 || c.startedAt == null) ? { ...c, startedAt: Date.now(), running: true } : c))
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (initialSource === 'daily' || restored) {
      trackGoal('puzzle_started', { level_id: snapshotRef.current.level.id, source: initialSource, resumed: restored != null })
    }
  }, [initialSource, restored])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pauseClock()
      else if (phase === 'play' && !solved && menu == null) resumeClock()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [phase, solved, menu, pauseClock, resumeClock])

  // ---- Saving ----------------------------------------------------------------

  // Written on every change while a puzzle is in play, and again when the
  // page hides or the screen closes, so Continue restores the latest board
  // and time.
  const savable = phase === 'play' && !solved && level !== emptyLevel
  const clockRef = useRef(clock)
  useLayoutEffect(() => {
    clockRef.current = clock
  }, [clock])
  const savedState = useRef<{ source: Source; snapshot: GameSnapshot; hintsRemaining: number } | null>(null)
  const persist = useCallback(() => {
    const state = savedState.current
    if (!state) return
    const c = clockRef.current
    const elapsed = c.banked + (c.running && c.startedAt != null ? Date.now() - c.startedAt : 0)
    saveGame(state.source, { snapshot: state.snapshot, elapsedMs: elapsed, hintsRemaining: state.hintsRemaining, assistanceUsed: assistanceUsed.current })
  }, [])

  useEffect(() => {
    savedState.current = savable ? { source, snapshot, hintsRemaining } : null
    persist()
  }, [savable, source, snapshot, hintsRemaining, hint, persist])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) persist()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [persist])

  // ---- Roll ----------------------------------------------------------------

  const gridRect = () => gridRef.current?.getBoundingClientRect() ?? null

  const roll = () => {
    if (phase !== 'ready') return
    gameAudio.playEffect('dice')
    const { roll: dice, level: next } = rollNewPuzzle(browserRandom, allPieces)
    setSnapshot(initialSnapshot(next))
    setHint(null)
    setHintsRemaining(3)
    assistanceUsed.current = false
    firstPlacementTracked.current = false
    solvedBefore.current = false
    setSelected(null)
    const grid = gridRect()
    const button = rollButtonRef.current?.getBoundingClientRect()
    const launchFrom = grid && button
      ? { x: (button.left + button.width / 2 - grid.left) / (grid.width / 6), y: (button.top + button.height / 2 - grid.top) / (grid.width / 6) }
      : undefined
    const root = rootRef.current?.getBoundingClientRect()
    if (!grid || !root) return
    setRollPlan({
      plan: generateRollPlan({ roll: dice, random: browserRandom, reduceMotion, launchFrom }),
      startedAt: performance.now(),
      grid: { left: grid.left - root.left, top: grid.top - root.top, size: grid.width },
    })
    setPhase('rolling')
    trackGoal('dice_roll_started', { source })
  }

  const finishRoll = useCallback(() => {
    setRollPlan(null)
    setPhase('play')
    startClock()
    trackGoal('dice_roll_completed', { source })
    trackGoal('puzzle_started', { level_id: snapshotRef.current.level.id, source })
  }, [source, startClock])

  const skipRoll = () => {
    setRollPlan((current) => (current ? { ...current, startedAt: -1e9 } : current))
  }

  // Tray entrance after a roll.
  useEffect(() => {
    if (phase !== 'play' || reveal >= 1) return
    const duration = reduceMotion ? 180 : 320
    const start = performance.now()
    let frame = 0
    const tick = (at: number) => {
      const t = Math.min(1, (at - start) / duration)
      setReveal(t)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Only when play begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ---- Completion ------------------------------------------------------------

  useEffect(() => {
    if (!solved || solvedBefore.current) {
      solvedBefore.current = solved
      return
    }
    solvedBefore.current = true
    clearSavedGame(source)
    const total = clock.banked + (clock.running && clock.startedAt != null ? Date.now() - clock.startedAt : 0)
    setClock({ startedAt: null, banked: total, running: false })
    setSelected(null)
    setHint(null)
    const stars = starsForAttempt(total, assistanceUsed.current)
    const award = onComplete({ stars, elapsedMs: total, assistanceUsed: assistanceUsed.current })
    setResult({ award, elapsedMs: total, assistanceUsed: assistanceUsed.current })
    trackGoal('puzzle_completed', {
      level_id: snapshot.level.id, source, placed_count: Object.keys(snapshot.placements).length,
      elapsed_ms: total, stars, assistance_used: assistanceUsed.current,
    })
    const sound = window.setTimeout(() => gameAudio.playEffect('complete'), 140)
    const duration = reduceMotion ? 450 : 1400
    const start = performance.now()
    let frame = 0
    const tick = (at: number) => {
      const t = Math.min(1, (at - start) / duration)
      setCelebration(t)
      if (t >= 0.5) setResultReady(true)
      if (t < 1) frame = requestAnimationFrame(tick)
      else setCelebration(null)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(sound)
    }
    // Runs once per solve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved])

  // ---- Hints -----------------------------------------------------------------

  const activeHint = hint && !placementMatches(snapshot, snapshot.placements[hint.pieceId], hint.target) ? hint : null

  const requestHint = () => {
    if (!interactive) return
    if (activeHint) {
      if (!snapshot.placements[activeHint.pieceId]) setSelected(activeHint.pieceId)
      setHintNonce((n) => n + 1)
      return
    }
    if (hintsRemaining <= 0) return
    const next = nextPlacementHint(snapshot)
    if (!next) return
    assistanceUsed.current = true
    setHint(next)
    setHintNonce((n) => n + 1)
    setHintsRemaining((n) => Math.max(0, n - 1))
    if (!snapshot.placements[next.pieceId]) setSelected(next.pieceId)
    gameAudio.playEffect('turn')
    trackGoal('hint_shown', { level_id: snapshot.level.id, source, piece_id: next.pieceId, kind: next.kind, hints_remaining: hintsRemaining - 1 })
  }

  const hintMarker: HintMarker | null = useMemo(() => {
    if (!activeHint) return null
    const piece = level.pieces.find((p) => p.id === activeHint.pieceId)
    if (!piece) return null
    const current = snapshot.placements[activeHint.pieceId]
    return {
      pieceId: activeHint.pieceId,
      target: { pieceId: piece.id, shape: transformCells(piece.cells, activeHint.target.orientation), origin: activeHint.target.origin },
      source: activeHint.kind === 'relocate' && current
        ? { pieceId: piece.id, shape: transformCells(piece.cells, current.orientation), origin: current.origin }
        : null,
      key: `${activeHint.pieceId}|${activeHint.kind}|${cellKey(activeHint.target.origin)}|${activeHint.target.orientation.quarterTurns}${activeHint.target.orientation.mirrored ? 'm' : ''}`,
      nonce: hintNonce,
    }
  }, [activeHint, level.pieces, snapshot.placements, hintNonce])

  // ---- Geometry helpers --------------------------------------------------------

  const trayPieceRect = useCallback((pieceId: string): Rect | null => {
    const tray = trayRef.current?.getBoundingClientRect()
    const index = level.pieces.findIndex((p) => p.id === pieceId)
    const slot = trayLayout.slots[index]
    if (!tray || !slot) return null
    const piece = level.pieces[index]
    const bounds = shapeBounds(transformCells(piece.cells, orientationOf(snapshotRef.current, pieceId)))
    const width = bounds.cols * trayLayout.cellSize
    const height = bounds.rows * trayLayout.cellSize
    return { left: tray.left + slot.left + (slot.size - width) / 2, top: tray.top + slot.top + (slot.size - height) / 2, width, height }
  }, [level.pieces, trayLayout])

  const boardRectOf = (origin: Cell, rows: number, cols: number): Rect | null => {
    const grid = gridRect()
    if (!grid) return null
    const cell = grid.width / 6
    return { left: grid.left + origin.col * cell, top: grid.top + origin.row * cell, width: cols * cell, height: rows * cell }
  }

  // ---- Piece actions ---------------------------------------------------------------

  const markTip = (tip: 'rotate' | 'place') => {
    setTips((current) => {
      const next = { ...current, [tip]: true }
      try { localStorage.setItem(tipsKey, JSON.stringify(next)) } catch { /* Optional storage. */ }
      return next
    })
  }

  const rotate = (pieceId: string) => {
    const next = rotatePiece(snapshotRef.current, pieceId)
    if (next !== snapshotRef.current) {
      setSnapshot(next)
      gameAudio.playEffect('turn')
      if (!tips.rotate) markTip('rotate')
    }
    setSelected(pieceId)
  }

  // ---- Drag --------------------------------------------------------------------

  const floatingRect = (s: DragSession, at: number): { rect: Rect; lift: number } => {
    if (s.phase === 'returning' && s.returnFrom && s.returnTo && s.returnStart != null) {
      const t = curves.easeOutCubic(Math.min(1, (at - s.returnStart) / (reduceMotion ? 140 : returnMs)))
      const from = s.returnFrom
      const to = s.returnTo
      return {
        rect: {
          left: from.left + (to.left - from.left) * t,
          top: from.top + (to.top - from.top) * t,
          width: from.width + (to.width - from.width) * t,
          height: from.height + (to.height - from.height) * t,
        },
        lift: 1 - t,
      }
    }
    const t = curves.easeOutCubic(Math.min(1, (at - s.liftStart) / (reduceMotion ? 70 : liftMs)))
    const grid = gridRect()
    const cell = grid ? grid.width / 6 : s.startRect.width / s.cols
    const width = s.startRect.width + (s.cols * cell - s.startRect.width) * t
    const height = s.startRect.height + (s.rows * cell - s.startRect.height) * t
    return { rect: { left: s.pointer.x - s.anchor.x * width, top: s.pointer.y - s.anchor.y * height, width, height }, lift: t }
  }

  const updateCandidate = (s: DragSession) => {
    const grid = gridRect()
    if (!grid) return
    const cell = grid.width / 6
    const width = s.cols * cell
    const height = s.rows * cell
    const left = s.pointer.x - s.anchor.x * width - grid.left
    const top = s.pointer.y - s.anchor.y * height - grid.top
    const origin = candidateOrigin(left, top, s.rows, s.cols, cell, 6)
    s.candidate = origin
    if (!origin) {
      setGhost((g) => (g ? null : g))
      return
    }
    const check = checkPlacement(snapshotRef.current, s.pieceId, origin)
    const conflicts = [...check.blocked, ...check.overlapping, ...check.outOfBounds].map((c) => ({ row: c.row - origin.row, col: c.col - origin.col }))
    setGhost((g) => {
      if (g && g.pieceId === s.pieceId && g.origin.row === origin.row && g.origin.col === origin.col && g.valid === check.isValid) return g
      return { pieceId: s.pieceId, shape: s.shape, origin, valid: check.isValid, conflicts }
    })
  }

  const settleTimers = useRef(new Map<string, number>())
  const settle = (pieceId: string, ms: number) => {
    if (reduceMotion) return
    window.clearTimeout(settleTimers.current.get(pieceId))
    setSettling((current) => new Set(current).add(pieceId))
    settleTimers.current.set(pieceId, window.setTimeout(() => {
      setSettling((current) => {
        const next = new Set(current)
        next.delete(pieceId)
        return next
      })
    }, ms))
  }

  const finishReturn = useCallback(() => {
    const s = session.current
    if (!s || s.phase !== 'returning') return
    if (s.shakeOnLanding) {
      nonce.current += 1
      setShake({ pieceId: s.pieceId, nonce: nonce.current })
      settle(s.pieceId, shakeDurationMs)
    }
    session.current = null
    setActive(null)
    setGhost(null)
    // settle is stable in practice; it only touches state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginReturn = (s: DragSession, to: Rect | null, shakeOnLanding: boolean) => {
    const at = performance.now()
    const from = floatingRect(s, at).rect
    s.returnFrom = from
    s.returnTo = to ?? from
    s.returnStart = at
    s.phase = 'returning'
    s.shakeOnLanding = shakeOnLanding
    setActive({ pieceId: s.pieceId, source: s.source, phase: 'returning', shape: s.shape })
    setGhost(null)
  }

  const makeRoom = () => {
    const s = session.current
    if (s && s.phase === 'returning') finishReturn()
    return session.current == null
  }

  const beginDrag = (pieceId: string, from: 'tray' | 'board', point: { x: number; y: number }) => {
    if (!makeRoom()) return false
    const current = snapshotRef.current
    const placement = current.placements[pieceId]
    if (from === 'tray' && placement) return false
    const piece = level.pieces.find((p) => p.id === pieceId)
    if (!piece) return false
    const orientation = orientationOf(current, pieceId)
    const shape = transformCells(piece.cells, placement?.orientation ?? orientation)
    const bounds = shapeBounds(shape)
    const startRect = from === 'tray' ? trayPieceRect(pieceId) : placement ? boardRectOf(placement.origin, bounds.rows, bounds.cols) : null
    if (!startRect) return false
    const s: DragSession = {
      pieceId,
      source: from,
      sourceOrigin: placement?.origin ?? null,
      shape,
      rows: bounds.rows,
      cols: bounds.cols,
      startRect,
      anchor: {
        x: Math.min(1, Math.max(0, (point.x - startRect.left) / startRect.width)),
        y: Math.min(1, Math.max(0, (point.y - startRect.top) / startRect.height)),
      },
      pointer: point,
      startPointer: point,
      candidate: null,
      phase: 'dragging',
      liftStart: performance.now(),
    }
    session.current = s
    setActive({ pieceId, source: from, phase: 'dragging', shape })
    setSelected(pieceId)
    updateCandidate(s)
    gameAudio.playEffect('pickup')
    return true
  }

  const endDrag = () => {
    const s = session.current
    if (!s || s.phase !== 'dragging') return
    const origin = s.candidate
    setGhost(null)
    const sourceRect = () => (s.source === 'tray' ? trayPieceRect(s.pieceId) : s.sourceOrigin ? boardRectOf(s.sourceOrigin, s.rows, s.cols) : null)

    // Held and released in place: the lifted position is not a deliberate target.
    if (Math.hypot(s.pointer.x - s.startPointer.x, s.pointer.y - s.startPointer.y) < touchSlop) {
      beginReturn(s, sourceRect(), false)
      return
    }
    const current = snapshotRef.current
    if (origin && checkPlacement(current, s.pieceId, origin).isValid) {
      const floating = floatingRect(s, performance.now()).rect
      const target = boardRectOf(origin, s.rows, s.cols)
      const next = placePiece(current, s.pieceId, origin)
      setSnapshot(next)
      gameAudio.playEffect('place')
      if (!tips.place) markTip('place')
      nonce.current += 1
      setSnap({
        pieceId: s.pieceId,
        nonce: nonce.current,
        offset: target ? { x: floating.left + floating.width / 2 - (target.left + target.width / 2), y: floating.top + floating.height / 2 - (target.top + target.height / 2) } : undefined,
      })
      settle(s.pieceId, snapDurationMs)
      if (Object.keys(current.placements).length === 0 && !firstPlacementTracked.current) {
        firstPlacementTracked.current = true
        trackGoal('first_piece_placed', { level_id: current.level.id, source, piece_id: s.pieceId })
      }
      session.current = null
      setActive(null)
      return
    }
    if (origin) {
      const check = checkPlacement(current, s.pieceId, origin)
      nonce.current += 1
      setReject({ cells: [...check.blocked, ...check.overlapping, ...check.outOfBounds], nonce: nonce.current })
      gameAudio.playEffect('reject')
      beginReturn(s, sourceRect(), true)
      return
    }
    // Released away from the board: the piece goes (back) to the tray.
    if (s.source === 'board') {
      setSnapshot((snap) => removePiece(snap, s.pieceId))
      gameAudio.playEffect('place')
    }
    beginReturn(s, trayPieceRect(s.pieceId), false)
  }

  const cancelDrag = () => {
    const s = session.current
    if (!s || s.phase !== 'dragging') return
    beginReturn(s, s.source === 'tray' ? trayPieceRect(s.pieceId) : s.sourceOrigin ? boardRectOf(s.sourceOrigin, s.rows, s.cols) : null, false)
  }

  /** Animates a placed piece back into its tray slot (tap on the board). */
  const sendToTray = (pieceId: string) => {
    if (!makeRoom()) return
    const placement = snapshotRef.current.placements[pieceId]
    const piece = level.pieces.find((p) => p.id === pieceId)
    if (!placement || !piece) return
    const shape = transformCells(piece.cells, placement.orientation)
    const bounds = shapeBounds(shape)
    const from = boardRectOf(placement.origin, bounds.rows, bounds.cols)
    if (!from) return
    setSnapshot((snap) => removePiece(snap, pieceId))
    gameAudio.playEffect('place')
    const s: DragSession = {
      pieceId, source: 'board', sourceOrigin: placement.origin, shape, rows: bounds.rows, cols: bounds.cols, startRect: from,
      anchor: { x: 0.5, y: 0.5 }, pointer: { x: 0, y: 0 }, startPointer: { x: 0, y: 0 }, candidate: null, phase: 'dragging', liftStart: 0,
    }
    session.current = s
    // The tray slot is laid out for the piece once it is unplaced; measure then.
    requestAnimationFrame(() => {
      if (session.current !== s) return
      s.returnFrom = from
      s.returnTo = trayPieceRect(pieceId) ?? from
      s.returnStart = performance.now()
      s.phase = 'returning'
      setActive({ pieceId, source: 'board', phase: 'returning', shape })
    })
    setActive({ pieceId, source: 'board', phase: 'returning', shape })
  }

  // ---- Gestures ------------------------------------------------------------------

  const onGesturePointerDown = (pieceId: string, from: 'tray' | 'board', event: ReactPointerEvent<HTMLElement>) => {
    if (!interactive || event.button !== 0 || gesture.current || held) return
    setKeyboardMode(false)
    event.preventDefault()
    const point = { x: event.clientX, y: event.clientY }
    const g: Gesture = {
      pointerId: event.pointerId,
      pieceId,
      source: from,
      down: point,
      last: point,
      slop: event.pointerType === 'mouse' ? mouseSlop : touchSlop,
      started: false,
      timer: window.setTimeout(() => {
        if (gesture.current !== g || g.started) return
        g.started = beginDrag(pieceId, from, g.last)
      }, holdToLiftMs),
    }
    gesture.current = g
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = gesture.current
      if (!g || g.pointerId !== event.pointerId) return
      g.last = { x: event.clientX, y: event.clientY }
      if (!g.started) {
        if (Math.hypot(g.last.x - g.down.x, g.last.y - g.down.y) <= g.slop) return
        window.clearTimeout(g.timer)
        // Start from the touch-down point, so the grab offset is exact.
        g.started = beginDrag(g.pieceId, g.source, g.down)
        if (!g.started) return
      }
      const s = session.current
      if (!s || s.phase !== 'dragging' || s.pieceId !== g.pieceId) return
      s.pointer = g.last
      updateCandidate(s)
    }
    const up = (event: PointerEvent) => {
      const g = gesture.current
      if (!g || g.pointerId !== event.pointerId) return
      window.clearTimeout(g.timer)
      gesture.current = null
      if (g.started) endDrag()
      else if (g.source === 'tray') rotate(g.pieceId)
      else sendToTray(g.pieceId)
    }
    const cancel = (event: PointerEvent) => {
      const g = gesture.current
      if (!g || g.pointerId !== event.pointerId) return
      window.clearTimeout(g.timer)
      gesture.current = null
      if (g.started) cancelDrag()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  })

  const onGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const grid = gridRect()
    if (!grid) return
    const cell = grid.width / 6
    const at = { row: Math.floor((event.clientY - grid.top) / cell), col: Math.floor((event.clientX - grid.left) / cell) }
    const key = cellKey(at)
    const placed = Object.values(snapshot.placements).find((p) => absoluteCells(snapshot, p).some((c) => cellKey(c) === key))
    if (placed) onGesturePointerDown(placed.pieceId, 'board', event)
  }

  const selectedPiece = selected ? level.pieces.find((p) => p.id === selected) : undefined
  const canFlip = !!selectedPiece && !snapshot.placements[selectedPiece.id] && selectedPiece.allowMirror && interactive
  const flip = () => {
    if (!canFlip || !selected) return
    setSnapshot((snap) => flipPiece(snap, selected))
    gameAudio.playEffect('turn')
  }

  // ---- Menu & flow ---------------------------------------------------------------

  const openMenu = () => {
    if (phase === 'rolling') return
    pauseClock()
    setMenu('menu')
  }
  const closeMenu = () => {
    setMenu(null)
    if (phase === 'play' && !solved) resumeClock()
  }
  const resetToRoll = () => {
    clearSavedGame('new')
    session.current = null
    setActive(null)
    setGhost(null)
    setMenu(null)
    setSource('new')
    setSnapshot(initialSnapshot(emptyLevel))
    setPhase('ready')
    setReveal(0)
    setHint(null)
    setSelected(null)
    setResult(null)
    setResultReady(false)
    setViewingBoard(false)
    setCelebration(null)
    setClock({ startedAt: null, banked: 0, running: false })
    solvedBefore.current = false
  }
  const restart = () => {
    setSnapshot((snap) => initialSnapshot(snap.level))
    setHint(null)
    setSelected(null)
    setMenu(null)
    resumeClock()
    trackGoal('puzzle_restarted', { level_id: snapshot.level.id, source })
  }

  // ---- Keyboard ------------------------------------------------------------------
  // Tab to a piece, Enter picks it up, arrows move it over the board, R/F
  // turn it, Enter places it, Escape puts it back. H asks for a hint and
  // Escape opens the pause menu.

  const heldShape = (hold: KeyHold, snap: GameSnapshot) => {
    const piece = level.pieces.find((p) => p.id === hold.pieceId)!
    return transformCells(piece.cells, orientationOf(snap, hold.pieceId))
  }

  const clampOrigin = (origin: Cell, shape: readonly Cell[]): Cell => {
    const b = shapeBounds(shape)
    return { row: Math.min(6 - b.rows, Math.max(0, origin.row)), col: Math.min(6 - b.cols, Math.max(0, origin.col)) }
  }

  /** Moves focus to [pieceId] (tray or board), or the first tray piece. */
  const focusPiece = (pieceId: string | null) => {
    requestAnimationFrame(() => {
      const host = rootRef.current
      if (!host) return
      const own = pieceId ? host.querySelector<HTMLElement>(`[data-piece="${pieceId}"]:not(:disabled), [data-board-piece="${pieceId}"]`) : null
      ;(own ?? host.querySelector<HTMLElement>('.tray-piece:not(:disabled)'))?.focus()
    })
  }

  const pickUp = (pieceId: string, from: 'tray' | 'board') => {
    // A piece still flying back to the tray lands at once, as for a drag.
    if (!interactive || held || !makeRoom()) return
    const current = snapshotRef.current
    const placement = current.placements[pieceId] ?? null
    if (from === 'tray' && placement) return
    const piece = level.pieces.find((p) => p.id === pieceId)
    if (!piece) return
    const shape = transformCells(piece.cells, orientationOf(current, pieceId))
    let origin: Cell = placement?.origin ?? { row: 0, col: 0 }
    if (!placement) {
      // Start on the first spot where the piece fits, reading order.
      search: for (let row = 0; row < 6; row += 1) {
        for (let col = 0; col < 6; col += 1) {
          if (checkPlacement(current, pieceId, { row, col }).isValid) {
            origin = { row, col }
            break search
          }
        }
      }
    }
    if (placement) setSnapshot(removePiece(current, pieceId))
    setHeld({ pieceId, source: from, origin: clampOrigin(origin, shape), restore: placement })
    setSelected(pieceId)
    gameAudio.playEffect('pickup')
  }

  const reorientHeld = (turn: 'rotate' | 'flip') => {
    if (!held) return
    const current = snapshotRef.current
    const next = turn === 'rotate' ? rotatePiece(current, held.pieceId) : flipPiece(current, held.pieceId)
    if (next === current) return
    setSnapshot(next)
    setHeld({ ...held, origin: clampOrigin(held.origin, heldShape(held, next)) })
    gameAudio.playEffect('turn')
    if (turn === 'rotate' && !tips.rotate) markTip('rotate')
  }

  const placeHeld = () => {
    if (!held) return
    const current = snapshotRef.current
    const check = checkPlacement(current, held.pieceId, held.origin)
    if (!check.isValid) {
      nonce.current += 1
      setReject({ cells: [...check.blocked, ...check.overlapping, ...check.outOfBounds], nonce: nonce.current })
      gameAudio.playEffect('reject')
      return
    }
    setSnapshot(placePiece(current, held.pieceId, held.origin))
    gameAudio.playEffect('place')
    if (!tips.place) markTip('place')
    nonce.current += 1
    setSnap({ pieceId: held.pieceId, nonce: nonce.current })
    settle(held.pieceId, snapDurationMs)
    if (Object.keys(current.placements).length === 0 && !firstPlacementTracked.current) {
      firstPlacementTracked.current = true
      trackGoal('first_piece_placed', { level_id: current.level.id, source, piece_id: held.pieceId })
    }
    setHeld(null)
    focusPiece(null)
  }

  const cancelHeld = () => {
    if (!held) return
    const { pieceId, restore } = held
    if (restore) {
      setSnapshot((snap) => ({
        ...snap,
        orientations: { ...snap.orientations, [pieceId]: restore.orientation },
        placements: { ...snap.placements, [pieceId]: restore },
      }))
    }
    setHeld(null)
    focusPiece(pieceId)
  }

  const onPieceKeyDown = (pieceId: string, from: 'tray' | 'board', event: ReactKeyboardEvent<HTMLElement>) => {
    if (held || !interactive) return
    const key = event.key
    const handled = () => {
      event.preventDefault()
      event.stopPropagation()
      setKeyboardMode(true)
    }
    if (key === 'Enter' || key === ' ') {
      handled()
      pickUp(pieceId, from)
    } else if (from === 'tray' && (key === 'r' || key === 'R')) {
      handled()
      rotate(pieceId)
    } else if (from === 'tray' && (key === 'f' || key === 'F')) {
      handled()
      setSelected(pieceId)
      const next = flipPiece(snapshotRef.current, pieceId)
      if (next !== snapshotRef.current) {
        setSnapshot(next)
        gameAudio.playEffect('turn')
      }
    } else if (from === 'board' && (key === 'Delete' || key === 'Backspace')) {
      handled()
      sendToTray(pieceId)
      focusPiece(pieceId)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const key = event.key
      if (key === 'Tab') setKeyboardMode(true)
      if (phase === 'rolling') {
        if (key === 'Enter' || key === ' ' || key === 'Escape') {
          event.preventDefault()
          skipRoll()
        }
        return
      }
      if (menu) {
        if (key === 'Escape') {
          event.preventDefault()
          if (menu === 'menu') closeMenu()
          else setMenu('menu')
        }
        return
      }
      if (held) {
        const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
        if (moves[key]) {
          event.preventDefault()
          const [dr, dc] = moves[key]
          setHeld({ ...held, origin: clampOrigin({ row: held.origin.row + dr, col: held.origin.col + dc }, heldShape(held, snapshotRef.current)) })
        } else if (key === 'r' || key === 'R') {
          event.preventDefault()
          reorientHeld('rotate')
        } else if (key === 'f' || key === 'F') {
          event.preventDefault()
          reorientHeld('flip')
        } else if (key === 'Enter' || key === ' ') {
          event.preventDefault()
          placeHeld()
        } else if (key === 'Escape' || key === 'Tab') {
          if (key === 'Escape') event.preventDefault()
          cancelHeld()
        }
        return
      }
      if (!interactive) return
      if (key === 'h' || key === 'H') {
        event.preventDefault()
        requestHint()
      } else if (key === 'Escape') {
        event.preventDefault()
        openMenu()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- Derived view state ------------------------------------------------------------

  const draggedId = active?.pieceId ?? null
  const boardPieces: BoardPiece[] = Object.values(snapshot.placements).map((p) => {
    const piece = level.pieces.find((value) => value.id === p.pieceId)!
    return { pieceId: p.pieceId, shape: transformCells(piece.cells, p.orientation), origin: p.origin }
  })
  const showBlocked = phase === 'play'
  const hiddenWells = new Set<string>([
    ...(showBlocked ? level.blockedCells.map(cellKey) : []),
    ...Object.values(snapshot.placements)
      .filter((p) => p.pieceId !== draggedId && !settling.has(p.pieceId))
      .flatMap((p) => absoluteCells(snapshot, p).map(cellKey)),
  ])
  const traySlots: TraySlotState[] = level.pieces.map((piece) => ({
    piece,
    orientation: orientationOf(snapshot, piece.id),
    placed: !!snapshot.placements[piece.id],
    opacity: active && active.pieceId === piece.id
      ? (active.source === 'tray' ? 0.25 : 0)
      : held?.pieceId === piece.id && held.source === 'tray' ? 0.25 : 1,
  }))
  const placedCount = Object.keys(snapshot.placements).length
  const subtitle = solved ? text.complete : source === 'daily' ? text.dailyChallenge : phase === 'ready' ? text.rollToStart : phase === 'play' ? text.fillEveryCell : text.rollingShort
  const hintCaption = activeHint ? (activeHint.kind === 'place' ? text.hintPlace : text.hintRelocate) : null
  const tip = !tips.rotate ? text.tipRotate : !tips.place ? text.tipPlace : null
  const barText = held ? text.keyboardMoveHelp : hintCaption ?? (keyboardMode ? text.keyboardHelp : tip) ?? text.progress(placedCount, level.pieces.length)
  const heldPreview: GhostPreview | null = (() => {
    if (!held) return null
    const shape = heldShape(held, snapshot)
    const check = checkPlacement(snapshot, held.pieceId, held.origin)
    return {
      pieceId: held.pieceId,
      shape,
      origin: held.origin,
      valid: check.isValid,
      conflicts: [...check.blocked, ...check.overlapping, ...check.outOfBounds].map((c) => ({ row: c.row - held.origin.row, col: c.col - held.origin.col })),
    }
  })()
  const board = (
    <Board
      extent={layout.extent}
      framePadding={layout.framePadding}
      blocked={level.blockedCells}
      showBlocked={showBlocked}
      pieces={boardPieces}
      hiddenWells={hiddenWells}
      draggedPieceId={draggedId}
      snap={snap}
      shake={shake}
      ghost={heldPreview ?? ghost}
      lifted={heldPreview}
      hint={hintMarker}
      reject={reject}
      solved={solved}
      celebration={celebration}
      reduceMotion={reduceMotion}
      gridRef={gridRef}
      label={text.progress(placedCount, level.pieces.length)}
      onGridPointerDown={interactive ? onGridPointerDown : undefined}
      interactive={interactive && !held}
      pieceLabel={(pieceId, origin) => text.pieceOnBoard(text.pieceName(pieceId, level.pieces.find((p) => p.id === pieceId)?.name ?? pieceId), cellLabel(origin))}
      onPieceKeyDown={(pieceId, event) => onPieceKeyDown(pieceId, 'board', event)}
    />
  )

  const header = (
    <div className="game-header" style={{ width: layout.wide ? layout.extent : layout.extent, height: headerHeight }}>
      <div className="game-title">
        <span className="brand-small" aria-label="Qybeq">QYBEQ</span>
        <span key={subtitle} className={`game-subtitle${solved ? ' solved' : ''}`}>{subtitle}</span>
      </div>
      <div className="clock-pill" aria-label={clockStarted ? text.timeLabel(formatClock(elapsedMs)) : text.timerNotStarted}>
        <Icon name="timerOutlined" size={15} />
        <span>{clockStarted ? formatClock(elapsedMs) : '--:--'}</span>
      </div>
      <button type="button" className="menu-button" onClick={openMenu} disabled={phase === 'rolling'} aria-label={text.gameMenu}>
        <Icon name="pauseRounded" size={22} />
      </button>
    </div>
  )

  const trayBar = (
    <div className="tray-bar" style={{ width: layout.extent, height: trayBarHeight, opacity: solved ? 0 : reveal, pointerEvents: interactive ? undefined : 'none' }}>
      <span key={barText} className={`tray-bar-text${held || hintCaption ? ' hint' : tip || keyboardMode ? ' tip' : ''}`}>{barText}</span>
      {!held && !hintCaption && (tip || keyboardMode) && <span className="tray-bar-count">{placedCount}/{level.pieces.length}</span>}
      <button
        type="button"
        className={`pill-button hint-pill${activeHint ? ' shown' : ''}`}
        disabled={!interactive || (!activeHint && hintsRemaining <= 0)}
        onClick={requestHint}
        aria-label={activeHint ? text.hintShown(text.hintsLeft(hintsRemaining)) : text.hintsLeft(hintsRemaining)}
      >
        <Icon name={activeHint ? 'lightbulbRounded' : 'lightbulbOutlineRounded'} size={17} />
        <span>{hintsRemaining}</span>
      </button>
      <button type="button" className="pill-button" disabled={!canFlip} onClick={flip} aria-label={text.flipSelectedPiece}>
        <Icon name="flipRounded" size={17} />
        <span>{text.flip}</span>
      </button>
    </div>
  )

  const trayArea = (
    <div
      className="tray-area"
      style={layout.wide
        ? { width: layout.columnWidth, height: headerHeight + 12 + layout.extent + 14 + trayBarHeight }
        : { width: layout.extent }}
    >
      <div className="tray-host" ref={trayRef} style={{ touchAction: 'none' }}>
        {phase !== 'ready' && !(solved && resultReady) && (
          <Tray
            layout={trayLayout}
            slots={traySlots}
            selectedPieceId={selected}
            interactive={interactive}
            reveal={reveal}
            reduceMotion={reduceMotion}
            shake={shake}
            onPointerDown={(pieceId, event) => onGesturePointerDown(pieceId, 'tray', event)}
            onKeyDown={(pieceId, event) => onPieceKeyDown(pieceId, 'tray', event)}
            onFocusPiece={(pieceId) => { if (!held) setSelected(pieceId) }}
            label={(piece, orientation) => `${text.pieceName(piece.id, piece.name)}, ${orientation.quarterTurns * 90}°${orientation.mirrored ? ', ⇋' : ''}`}
          />
        )}
      </div>
      <div className={`start-prompt${phase === 'ready' ? ' ready' : ''}`}>
        <RollDiceButton label={text.rollDice} enabled={phase === 'ready'} onPress={roll} dice={appearance.dice} buttonRef={rollButtonRef} />
        <p className="caption">{text.sixDice}</p>
      </div>
      <p className={`skip-caption${phase === 'rolling' ? ' visible' : ''}`}>{text.tapAnywhereToSkip}</p>
      {solved && resultReady && (
        viewingBoard
          ? <div className="result-back"><SecondaryAction label={text.backToResults} icon="expandLessRounded" compact onPress={() => setViewingBoard(false)} /></div>
          : <ResultPanel text={text} result={result} onNewPuzzle={resetToRoll} onViewBoard={() => setViewingBoard(true)} onMainMenu={onBack} />
      )}
    </div>
  )

  return (
    <main ref={rootRef} className={`game-root${layout.wide ? ' wide' : ''}`}>
      <div className="app-backdrop" aria-hidden="true" />
      {layout.wide ? (
        <div className="game-columns">
          <div className="game-column">
            {header}
            <div style={{ height: 12 }} />
            {board}
            <div style={{ height: 14 }} />
            {trayBar}
          </div>
          {trayArea}
        </div>
      ) : (
        <div className="game-column phone">
          <div style={{ height: 8 }} />
          {header}
          <div style={{ height: 12 }} />
          {board}
          <div style={{ height: 14 }} />
          {trayBar}
          {trayArea}
        </div>
      )}

      {rollPlan && (
        <DiceRollLayer
          plan={rollPlan.plan}
          skin={appearance.dice}
          grid={rollPlan.grid}
          startedAt={rollPlan.startedAt}
          onSkip={skipRoll}
          onFinished={finishRoll}
        />
      )}

      {active && createPortal(
        <DragOverlay
          drag={active}
          session={session}
          boardCell={(layout.extent - 2 * layout.framePadding - 2) / 6}
          floatingRect={floatingRect}
          ghost={ghost}
          onReturned={finishReturn}
        />,
        document.body,
      )}

      {menu === 'menu' && (
        <Sheet label={text.paused} onDismiss={closeMenu}>
          <h2 className="sheet-title">{text.paused}</h2>
          <div className="sheet-actions">
            <PrimaryAction label={text.resume} compact onPress={closeMenu} />
            <MenuRow icon="restartAltRounded" label={text.restartPuzzle} onPress={() => setMenu('restart')} disabled={phase !== 'play' || solved} />
            <MenuRow icon="casinoOutlined" label={text.newPuzzle} onPress={() => (phase === 'play' && !solved && placedCount > 0 ? setMenu('new') : resetToRoll())} />
            <MenuRow icon="gridViewRounded" label={text.mainMenu} onPress={onBack} />
            {/* Development builds only, like the mobile Developer section. */}
            {import.meta.env.DEV && phase === 'play' && !solved && (
              <MenuRow icon="extensionOutlined" label="Auto-solve" onPress={() => { setMenu(null); resumeClock(); setSnapshot((snap) => applyReferenceSolution(snap)) }} />
            )}
          </div>
        </Sheet>
      )}
      {menu === 'restart' && (
        <Confirm title={text.restartTitle} body={text.restartBody} confirm={text.restart} cancel={text.cancel} onConfirm={restart} onCancel={() => setMenu('menu')} />
      )}
      {menu === 'new' && (
        <Confirm title={text.newPuzzleTitle} body={text.newPuzzleBody} confirm={text.newPuzzle} cancel={text.cancel} onConfirm={resetToRoll} onCancel={() => setMenu('menu')} />
      )}
    </main>
  )
}

function MenuRow({ icon, label, onPress, disabled = false }: { icon: 'restartAltRounded' | 'casinoOutlined' | 'gridViewRounded' | 'extensionOutlined'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="menu-row" onClick={onPress} disabled={disabled}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </button>
  )
}

function Confirm({ title, body, confirm, cancel, onConfirm, onCancel }: { title: string; body: string; confirm: string; cancel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Sheet label={title} onDismiss={onCancel}>
      <h2 className="sheet-title">{title}</h2>
      <p className="sheet-body">{body}</p>
      <div className="sheet-actions">
        <PrimaryAction label={confirm} compact onPress={onConfirm} />
        <SecondaryAction label={cancel} compact onPress={onCancel} />
      </div>
    </Sheet>
  )
}

/** The piece under the finger (and while it flies back). Never takes input. */
function DragOverlay({ drag, session, boardCell, floatingRect, ghost, onReturned }: {
  drag: ActiveDrag
  session: React.MutableRefObject<DragSession | null>
  boardCell: number
  floatingRect: (s: DragSession, at: number) => { rect: Rect; lift: number }
  ghost: GhostPreview | null
  onReturned: () => void
}) {
  const appearance = useAppearance()
  const node = useRef<HTMLDivElement>(null)
  const [lift, setLift] = useState(0)
  useEffect(() => {
    let frame = 0
    const tick = (at: number) => {
      const current = session.current
      const element = node.current
      if (!current || !element) return
      const { rect, lift: l } = floatingRect(current, at)
      const artWidth = current.cols * boardCell
      const artHeight = current.rows * boardCell
      const scale = rect.width / artWidth
      const liftScale = 1 + (liftedScale - 1) * l
      element.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(${scale}) translate(${artWidth / 2}px, ${artHeight / 2}px) scale(${liftScale}) translate(${-artWidth / 2}px, ${-artHeight / 2}px)`
      setLift((previous) => (Math.abs(previous - l) > 0.04 || (l >= 1 && previous < 1) || (l <= 0 && previous > 0) ? l : previous))
      if (current.phase === 'returning' && current.returnStart != null && at - current.returnStart >= returnMs) {
        onReturned()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [session, boardCell, floatingRect, onReturned])
  const overBoard = ghost != null && drag.phase === 'dragging'
  return (
    <div ref={node} className="drag-overlay" style={{ opacity: overBoard ? 0.72 : 1 }} aria-hidden="true">
      <PieceArt
        cells={drag.shape}
        color={pieceColor(appearance.pieces, drag.pieceId)}
        material={appearance.pieces.material}
        cellSize={boardCell}
        elevation={lift}
        tint={overBoard && !ghost.valid ? withAlpha(invalidColor, 0.42) : null}
      />
    </div>
  )
}

function ResultPanel({ text, result, onNewPuzzle, onViewBoard, onMainMenu }: {
  text: AppCopy
  result: { award: CompletionAward | null; elapsedMs: number; assistanceUsed: boolean } | null
  onNewPuzzle: () => void
  onViewBoard: () => void
  onMainMenu: () => void
}) {
  const award = result?.award
  return (
    <div className="result-panel" role="status">
      {award ? (
        <div className="result-stars" aria-label={text.resultStars(award.attemptStars)}>
          <div className="result-star-row">
            {[0, 1, 2].map((i) => <Icon key={i} name={i < award.attemptStars ? 'starRounded' : 'starOutlineRounded'} size={32} color={i < award.attemptStars ? '#5B8CFF' : '#7A808C'} />)}
          </div>
          <span className="result-balance">
            {award.earnedDelta === 0 ? text.starsAvailable(award.availableStars) : `${text.earnedStars(award.earnedDelta)} · ${text.starsAvailable(award.availableStars)}`}
          </span>
        </div>
      ) : (
        <Icon name="checkCircleRounded" size={34} color="#6CF2D2" />
      )}
      <h2 className="result-title">{text.puzzleCompleteTitle}</h2>
      {result && <p className="result-time">{text.solvedIn(formatClock(result.elapsedMs))}</p>}
      {award && <p className="caption">{result?.assistanceUsed ? text.assistedResult : text.noAssistance}</p>}
      <div className="result-actions">
        <PrimaryAction label={text.newPuzzle} onPress={onNewPuzzle} />
        <div className="result-secondary">
          <SecondaryAction label={text.viewBoard} compact onPress={onViewBoard} />
          <SecondaryAction label={text.mainMenu} compact onPress={onMainMenu} />
        </div>
      </div>
    </div>
  )
}
