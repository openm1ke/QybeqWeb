import { beforeEach, describe, expect, it } from 'vitest'
import { initialSnapshot, placePiece, rotatePiece } from '../game/controller'
import { levelForRoll, rollShowing } from '../game/dice'
import { pieces, sampleLevel } from '../game/pieces'
import { clearSavedGame, loadSavedGame, saveGame, savedGameKeys } from '../game/savedGame'

const level = levelForRoll(rollShowing(sampleLevel.blockedCells), pieces)!

function inProgress() {
  let snapshot = initialSnapshot(level)
  snapshot = rotatePiece(snapshot, 'line4')
  snapshot = placePiece(snapshot, 'line4', { row: 0, col: 0 })
  snapshot = rotatePiece(snapshot, 'tee')
  return snapshot
}

describe('saved game', () => {
  beforeEach(() => localStorage.clear())

  it('restores the board, orientations, clock and hints', () => {
    const snapshot = inProgress()
    saveGame('new', { snapshot, elapsedMs: 83_400, hintsRemaining: 2, assistanceUsed: true })
    const restored = loadSavedGame('new')
    expect(restored).not.toBeNull()
    expect(restored!.snapshot.level.blockedCells).toEqual(level.blockedCells)
    expect(restored!.snapshot.placements).toEqual(snapshot.placements)
    expect(restored!.snapshot.orientations).toEqual(snapshot.orientations)
    expect(restored!.elapsedMs).toBe(83_400)
    expect(restored!.hintsRemaining).toBe(2)
    expect(restored!.assistanceUsed).toBe(true)
  })

  it('keeps a regular puzzle and the Daily Challenge apart', () => {
    saveGame('new', { snapshot: inProgress(), elapsedMs: 1000, hintsRemaining: 3, assistanceUsed: false })
    expect(loadSavedGame('daily')).toBeNull()
    clearSavedGame('new')
    expect(loadSavedGame('new')).toBeNull()
  })

  it('drops a Daily Challenge saved on another day', () => {
    const monday = new Date(2026, 8, 28, 12)
    saveGame('daily', { snapshot: inProgress(), elapsedMs: 1000, hintsRemaining: 3, assistanceUsed: false }, monday)
    expect(loadSavedGame('daily', monday)).not.toBeNull()
    expect(loadSavedGame('daily', new Date(2026, 8, 29, 12))).toBeNull()
    expect(localStorage.getItem(savedGameKeys.daily)).toBeNull()
  })

  it('discards corrupt records and illegal placements', () => {
    localStorage.setItem(savedGameKeys.new, '{not json')
    expect(loadSavedGame('new')).toBeNull()
    expect(localStorage.getItem(savedGameKeys.new)).toBeNull()

    saveGame('new', { snapshot: inProgress(), elapsedMs: -5, hintsRemaining: 9, assistanceUsed: false })
    const record = JSON.parse(localStorage.getItem(savedGameKeys.new)!)
    // A square over the blocked B2 and an unknown piece are ignored.
    record.placements.push({ pieceId: 'square', origin: 'B1', orientation: { quarterTurns: 0, mirrored: false } })
    record.placements.push({ pieceId: 'ghost', origin: 'C1', orientation: { quarterTurns: 0, mirrored: false } })
    record.hintsRemaining = 9
    localStorage.setItem(savedGameKeys.new, JSON.stringify(record))
    const restored = loadSavedGame('new')!
    expect(Object.keys(restored.snapshot.placements)).toEqual(['line4'])
    expect(restored.elapsedMs).toBe(0)
    expect(restored.hintsRemaining).toBe(3)

    localStorage.setItem(savedGameKeys.new, JSON.stringify({ ...record, blocked: ['A1', 'A2', 'C1', 'D1', 'E1', 'F1'] }))
    expect(loadSavedGame('new')).toBeNull()
  })
})
