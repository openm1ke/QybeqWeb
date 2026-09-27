import { parseCell } from './cells'
import { cellsFromPattern } from './transforms'
import type { PieceDefinition, Placement, PuzzleLevel } from './types'

function piece(
  id: string,
  name: string,
  pattern: string,
  options: Partial<Pick<PieceDefinition, 'allowRotation' | 'allowMirror'>> = {},
): PieceDefinition {
  return {
    id,
    name,
    cells: cellsFromPattern(pattern),
    allowRotation: options.allowRotation ?? true,
    allowMirror: options.allowMirror ?? true,
  }
}

export const pieces = [
  piece('line4', 'Line', '# / # / # / #', { allowMirror: false }),
  piece('elbow4', 'L', '#. / #. / ##'),
  piece('tee', 'T', '### / .#.', { allowMirror: false }),
  piece('square', 'Square', '## / ##', { allowMirror: false }),
  piece('zigzag', 'S', '.## / ##.'),
  piece('flare', 'F-pentomino', '.## / ##. / .#.'),
  piece('elbow3', 'Small L', '#. / ##'),
  piece('domino', 'Domino', '##', { allowMirror: false }),
] as const satisfies readonly PieceDefinition[]

const byId = new Map(pieces.map((value) => [value.id, value]))

function solved(pieceId: string, origin: string, quarterTurns = 0): Placement {
  if (!byId.has(pieceId)) throw new Error(`Unknown piece: ${pieceId}`)
  return {
    pieceId,
    origin: parseCell(origin),
    orientation: { quarterTurns, mirrored: false },
  }
}

export const sampleLevel: PuzzleLevel = {
  id: 'prototype-01',
  boardSize: 6,
  blockedCells: ['A6', 'B2', 'C5', 'D3', 'E2', 'F4'].map(parseCell),
  pieces,
  referenceSolution: [
    solved('line4', 'A1', 1),
    solved('tee', 'A4', 2),
    solved('elbow4', 'B1'),
    solved('flare', 'B2', 1),
    solved('elbow3', 'C5', 3),
    solved('domino', 'E1', 1),
    solved('zigzag', 'E2'),
    solved('square', 'E5'),
  ],
}

export function pieceById(id: string): PieceDefinition {
  const result = byId.get(id)
  if (!result) throw new Error(`Unknown piece: ${id}`)
  return result
}
