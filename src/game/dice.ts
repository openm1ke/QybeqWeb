import { cellLabel } from './cells'
import type { RandomSource } from './random'
import { solvePuzzle } from './solver'
import type { Cell, PieceDefinition, PuzzleLevel } from './types'

/**
 * Coordinate dice (mobile `CoordinateDiceSet.rowDice`): one die per row, its
 * six faces are that row's cells, so every roll blocks one cell per row.
 */
export interface DieResult {
  /** Row of the die (die "B" has faces B1…B6). */
  readonly row: number
  readonly faceIndex: number
}

export type DiceRoll = readonly DieResult[]

export function rollCell(result: DieResult): Cell {
  return { row: result.row, col: result.faceIndex }
}

/** The five faces that are not on top, for drawing the die's sides. */
export function otherFaces(result: DieResult, boardSize = 6): Cell[] {
  return Array.from({ length: boardSize }, (_, col) => col)
    .filter((col) => col !== result.faceIndex)
    .map((col) => ({ row: result.row, col }))
}

export function throwDice(random: RandomSource, boardSize = 6): DiceRoll {
  return Array.from({ length: boardSize }, (_, row) => ({ row, faceIndex: random.nextInt(boardSize) }))
}

/** The roll that shows exactly [cells] (one per row). */
export function rollShowing(cells: readonly Cell[]): DiceRoll {
  return cells.map((cell) => ({ row: cell.row, faceIndex: cell.col }))
}

/**
 * The puzzle a roll defines, or null if the pieces cannot tile it by
 * rotation alone (mobile `GameController.loadRoll`).
 */
export function levelForRoll(roll: DiceRoll, pieces: readonly PieceDefinition[], boardSize = 6): PuzzleLevel | null {
  const blockedCells = roll.map(rollCell)
  const solution = solvePuzzle({ boardSize, blockedCells, pieces })
  if (!solution) return null
  return {
    id: `roll-${blockedCells.map(cellLabel).join('-')}`,
    boardSize,
    blockedCells,
    pieces,
    referenceSolution: solution,
  }
}

/**
 * Throws until the roll is solvable (mobile `GameController.rollNewPuzzle`):
 * every puzzle can be finished without Flip.
 */
export function rollNewPuzzle(
  random: RandomSource,
  pieces: readonly PieceDefinition[],
  boardSize = 6,
  maxAttempts = 500,
): { roll: DiceRoll; level: PuzzleLevel } {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const roll = throwDice(random, boardSize)
    const level = levelForRoll(roll, pieces, boardSize)
    if (level) return { roll, level }
  }
  throw new Error(`No solvable roll in ${maxAttempts} attempts`)
}
