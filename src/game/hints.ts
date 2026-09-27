import { absoluteCells } from './controller'
import { cellKey } from './cells'
import type { GameSnapshot, Placement } from './types'

export interface PlacementHint {
  readonly kind: 'place' | 'relocate'
  readonly pieceId: string
  readonly target: Placement
}

export function placementMatches(snapshot: GameSnapshot, actual: Placement | undefined, target: Placement): boolean {
  if (actual == null || actual.pieceId !== target.pieceId) return false
  const actualCells = absoluteCells(snapshot, actual).map(cellKey).sort()
  const targetCells = absoluteCells(snapshot, target).map(cellKey).sort()
  return actualCells.length === targetCells.length && actualCells.every((cell, index) => cell === targetCells[index])
}

export function nextPlacementHint(snapshot: GameSnapshot): PlacementHint | null {
  const misplaced = snapshot.level.referenceSolution.find((target) => {
    const actual = snapshot.placements[target.pieceId]
    return actual != null && !placementMatches(snapshot, actual, target)
  })
  if (misplaced) return { kind: 'relocate', pieceId: misplaced.pieceId, target: misplaced }

  const unplaced = snapshot.level.referenceSolution.find((target) => snapshot.placements[target.pieceId] == null)
  return unplaced ? { kind: 'place', pieceId: unplaced.pieceId, target: unplaced } : null
}
