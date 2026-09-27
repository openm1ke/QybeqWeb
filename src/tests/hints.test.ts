import { describe, expect, it } from 'vitest'
import { applyReferenceSolution, initialSnapshot } from '../game/controller'
import { nextPlacementHint, placementMatches } from '../game/hints'
import { sampleLevel } from '../game/pieces'

describe('placement hints', () => {
  it('suggests one piece without changing the puzzle', () => {
    const snapshot = initialSnapshot(sampleLevel)
    const hint = nextPlacementHint(snapshot)

    expect(hint).toMatchObject({ kind: 'place', pieceId: 'line4' })
    expect(snapshot.placements).toEqual({})
  })

  it('asks to relocate a placed piece that differs from the reference', () => {
    const target = sampleLevel.referenceSolution[0]
    const snapshot = {
      ...initialSnapshot(sampleLevel),
      placements: {
        [target.pieceId]: { ...target, origin: { row: target.origin.row + 1, col: target.origin.col } },
      },
    }

    expect(nextPlacementHint(snapshot)).toMatchObject({ kind: 'relocate', pieceId: target.pieceId, target })
  })

  it('has no next move after the reference solution is complete', () => {
    const solved = applyReferenceSolution(initialSnapshot(sampleLevel))
    expect(nextPlacementHint(solved)).toBeNull()
    expect(placementMatches(solved.placements.line4, sampleLevel.referenceSolution[0])).toBe(true)
  })
})
