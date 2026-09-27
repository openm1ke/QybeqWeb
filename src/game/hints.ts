import type { GameSnapshot, Placement } from './types'

export interface PlacementHint {
  readonly kind: 'place' | 'relocate'
  readonly pieceId: string
  readonly target: Placement
}

function normalizedTurns(value: number): number {
  return ((value % 4) + 4) % 4
}

export function placementMatches(actual: Placement | undefined, target: Placement): boolean {
  return actual != null &&
    actual.pieceId === target.pieceId &&
    actual.origin.row === target.origin.row &&
    actual.origin.col === target.origin.col &&
    normalizedTurns(actual.orientation.quarterTurns) === normalizedTurns(target.orientation.quarterTurns) &&
    actual.orientation.mirrored === target.orientation.mirrored
}

export function nextPlacementHint(snapshot: GameSnapshot): PlacementHint | null {
  const misplaced = snapshot.level.referenceSolution.find((target) => {
    const actual = snapshot.placements[target.pieceId]
    return actual != null && !placementMatches(actual, target)
  })
  if (misplaced) return { kind: 'relocate', pieceId: misplaced.pieceId, target: misplaced }

  const unplaced = snapshot.level.referenceSolution.find((target) => snapshot.placements[target.pieceId] == null)
  return unplaced ? { kind: 'place', pieceId: unplaced.pieceId, target: unplaced } : null
}
