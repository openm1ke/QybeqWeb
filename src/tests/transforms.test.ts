import { describe, expect, it } from 'vitest'
import { cellLabel } from '../game/cells'
import { cellsFromPattern, flipOrientationHorizontally, transformCells } from '../game/transforms'

describe('piece transforms', () => {
  const elbow = cellsFromPattern('#. / #. / ##')

  it('normalizes and rotates exactly like the Dart model', () => {
    const rotated = transformCells(elbow, { quarterTurns: 1, mirrored: false })
    expect(rotated.map(cellLabel)).toEqual(['A1', 'A2', 'A3', 'B1'])
  })

  it('keeps a visible horizontal flip after rotation', () => {
    const orientation = flipOrientationHorizontally({ quarterTurns: 1, mirrored: false })
    expect(orientation).toEqual({ quarterTurns: 3, mirrored: true })
  })
})
