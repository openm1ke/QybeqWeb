import { cellLabel, parseCell } from './cells'
import { checkPlacement, initialSnapshot } from './controller'
import { dailyKey } from './daily'
import { levelForRoll, rollShowing } from './dice'
import { pieces } from './pieces'
import type { Cell, GameSnapshot, Orientation } from './types'

/**
 * The unfinished puzzle between visits (mobile `SavedGame`), versioned and
 * validated on load: the board is rebuilt from its blocked cells with the
 * solver, and every placement is re-checked, so a stale or edited record can
 * never produce an illegal board. A regular puzzle and today's Daily
 * Challenge are kept apart.
 */
export type SavedSource = 'new' | 'daily'

interface SavedRecord {
  schemaVersion: 1
  day?: string
  blocked: string[]
  orientations: Record<string, Orientation>
  placements: { pieceId: string; origin: string; orientation: Orientation }[]
  elapsedMs: number
  hintsRemaining: number
  assistanceUsed: boolean
}

export interface RestoredGame {
  readonly snapshot: GameSnapshot
  readonly elapsedMs: number
  readonly hintsRemaining: number
  readonly assistanceUsed: boolean
}

export const savedGameKeys: Record<SavedSource, string> = {
  new: 'qybeq.savedGame.v1',
  daily: 'qybeq.savedDaily.v1',
}

export function saveGame(source: SavedSource, game: RestoredGame, now = new Date()): void {
  const { snapshot } = game
  const record: SavedRecord = {
    schemaVersion: 1,
    ...(source === 'daily' ? { day: dailyKey(now) } : {}),
    blocked: snapshot.level.blockedCells.map(cellLabel),
    orientations: { ...snapshot.orientations },
    placements: Object.values(snapshot.placements).map((p) => ({ pieceId: p.pieceId, origin: cellLabel(p.origin), orientation: p.orientation })),
    elapsedMs: Math.max(0, Math.round(game.elapsedMs)),
    hintsRemaining: game.hintsRemaining,
    assistanceUsed: game.assistanceUsed,
  }
  try {
    localStorage.setItem(savedGameKeys[source], JSON.stringify(record))
  } catch {
    /* Optional storage. */
  }
}

export function clearSavedGame(source: SavedSource): void {
  try {
    localStorage.removeItem(savedGameKeys[source])
  } catch {
    /* Optional storage. */
  }
}

export function loadSavedGame(source: SavedSource, now = new Date()): RestoredGame | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(savedGameKeys[source])
  } catch {
    return null
  }
  if (!raw) return null
  const restored = restore(raw, source, now)
  if (!restored) clearSavedGame(source)
  return restored
}

function restore(raw: string, source: SavedSource, now: Date): RestoredGame | null {
  let record: Partial<SavedRecord>
  try {
    record = JSON.parse(raw) as Partial<SavedRecord>
  } catch {
    return null
  }
  if (!record || record.schemaVersion !== 1 || !Array.isArray(record.blocked)) return null
  if (source === 'daily' && record.day !== dailyKey(now)) return null
  let blocked: Cell[]
  try {
    blocked = record.blocked.map((label) => parseCell(String(label)))
  } catch {
    return null
  }
  if (blocked.length !== 6 || blocked.some((cell, row) => cell.row !== row || cell.col < 0 || cell.col > 5)) return null
  const level = levelForRoll(rollShowing(blocked), pieces)
  if (!level) return null

  const ids = new Set(pieces.map((p) => p.id))
  const orientations: Record<string, Orientation> = {}
  for (const [id, value] of Object.entries(record.orientations ?? {})) {
    if (ids.has(id) && isOrientation(value)) orientations[id] = { quarterTurns: value.quarterTurns, mirrored: value.mirrored }
  }
  let snapshot: GameSnapshot = { ...initialSnapshot(level), orientations }
  for (const placement of record.placements ?? []) {
    if (!ids.has(placement?.pieceId) || !isOrientation(placement.orientation)) continue
    let origin: Cell
    try {
      origin = parseCell(String(placement.origin))
    } catch {
      continue
    }
    const orientation = { quarterTurns: placement.orientation.quarterTurns, mirrored: placement.orientation.mirrored }
    if (!checkPlacement(snapshot, placement.pieceId, origin, orientation).isValid) continue
    snapshot = {
      ...snapshot,
      orientations: { ...snapshot.orientations, [placement.pieceId]: orientation },
      placements: { ...snapshot.placements, [placement.pieceId]: { pieceId: placement.pieceId, origin, orientation } },
    }
  }
  return {
    snapshot,
    elapsedMs: Number.isFinite(record.elapsedMs) ? Math.max(0, record.elapsedMs!) : 0,
    hintsRemaining: Number.isInteger(record.hintsRemaining) ? Math.min(3, Math.max(0, record.hintsRemaining!)) : 3,
    assistanceUsed: record.assistanceUsed === true,
  }
}

function isOrientation(value: unknown): value is Orientation {
  const o = value as Orientation | undefined
  return !!o && Number.isInteger(o.quarterTurns) && o.quarterTurns >= 0 && o.quarterTurns < 4 && typeof o.mirrored === 'boolean'
}
