import { compareCells } from './cells'
import type { Cell, Orientation } from './types'

export function normalizeCells(cells: readonly Cell[]): Cell[] {
  if (cells.length === 0) return []
  const minRow = Math.min(...cells.map((cell) => cell.row))
  const minCol = Math.min(...cells.map((cell) => cell.col))
  return cells
    .map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol }))
    .sort(compareCells)
}

export function rotateCellsClockwise(cells: readonly Cell[]): Cell[] {
  return normalizeCells(cells.map((cell) => ({ row: cell.col, col: -cell.row })))
}

export function mirrorCells(cells: readonly Cell[]): Cell[] {
  return normalizeCells(cells.map((cell) => ({ row: cell.row, col: -cell.col })))
}

export function transformCells(cells: readonly Cell[], orientation: Orientation): Cell[] {
  let result = normalizeCells(cells)
  if (orientation.mirrored) result = mirrorCells(result)
  for (let turn = 0; turn < orientation.quarterTurns; turn += 1) {
    result = rotateCellsClockwise(result)
  }
  return result
}

export function cellsFromPattern(pattern: string): Cell[] {
  const rows = pattern
    .split(/[/\n]/)
    .map((row) => row.trim())
    .filter(Boolean)
  return normalizeCells(rows.flatMap((row, rowIndex) =>
    [...row].flatMap((character, colIndex) =>
      character === '#' ? [{ row: rowIndex, col: colIndex }] : [],
    ),
  ))
}

export function shapeBounds(cells: readonly Cell[]): { rows: number; cols: number } {
  return {
    rows: cells.reduce((value, cell) => Math.max(value, cell.row + 1), 0),
    cols: cells.reduce((value, cell) => Math.max(value, cell.col + 1), 0),
  }
}

export function rotateOrientationClockwise(orientation: Orientation): Orientation {
  return { ...orientation, quarterTurns: (orientation.quarterTurns + 1) % 4 }
}

export function flipOrientationHorizontally(orientation: Orientation): Orientation {
  return {
    quarterTurns: (4 - orientation.quarterTurns) % 4,
    mirrored: !orientation.mirrored,
  }
}
