import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/game-parity.v1.json'
import { applyReferenceSolution, checkPlacement, initialSnapshot, isSolved, placePiece } from '../game/controller'
import { cellLabel, parseCell } from '../game/cells'
import { sampleLevel } from '../game/pieces'
import { solvePuzzle } from '../game/solver'

describe('Qybeq game core', () => {
  it('matches the shared board fixture', () => {
    expect(sampleLevel.blockedCells.map(cellLabel)).toEqual(fixture.blockedCells)
    expect(Object.fromEntries(sampleLevel.pieces.map((piece) => [piece.id, piece.cells.length])))
      .toEqual(fixture.pieceAreas)
  })

  it('rejects blocked and overlapping placements without changing state', () => {
    const empty = initialSnapshot(sampleLevel)
    expect(checkPlacement(empty, 'line4', parseCell('A6')).isValid).toBe(false)
    const placed = placePiece(empty, 'line4', parseCell('A1'))
    expect(checkPlacement(placed, 'domino', parseCell('A1')).isValid).toBe(false)
  })

  it('validates the mobile reference solution', () => {
    expect(isSolved(applyReferenceSolution(initialSnapshot(sampleLevel)))).toBe(true)
  })

  it('finds a complete rotations-only solution', () => {
    const solution = solvePuzzle({
      boardSize: sampleLevel.boardSize,
      blockedCells: sampleLevel.blockedCells,
      pieces: sampleLevel.pieces,
    })
    expect(solution).not.toBeNull()
    let snapshot = initialSnapshot(sampleLevel)
    for (const placement of solution ?? []) {
      snapshot = {
        ...snapshot,
        orientations: { ...snapshot.orientations, [placement.pieceId]: placement.orientation },
      }
      snapshot = placePiece(snapshot, placement.pieceId, placement.origin)
    }
    expect(isSolved(snapshot)).toBe(true)
  })
})
