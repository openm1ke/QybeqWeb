import type { Cell } from './types'

/**
 * Where a floating rows × cols piece whose bounding box starts at the
 * board-local ([left], [top]) would land (mobile `BoardGeometry.candidateOrigin`):
 * the cell under the centre of its first cell, clamped so the whole piece
 * stays on the board. Null when the piece's centre is not over the board.
 */
export function candidateOrigin(
  left: number,
  top: number,
  rows: number,
  cols: number,
  cellSize: number,
  boardSize: number,
): Cell | null {
  const extent = cellSize * boardSize
  const cx = left + (cols * cellSize) / 2
  const cy = top + (rows * cellSize) / 2
  if (cx < 0 || cy < 0 || cx >= extent || cy >= extent) return null
  const row = Math.floor((top + cellSize / 2) / cellSize)
  const col = Math.floor((left + cellSize / 2) / cellSize)
  return {
    row: Math.min(boardSize - rows, Math.max(0, row)),
    col: Math.min(boardSize - cols, Math.max(0, col)),
  }
}

/** The grid cell under a board-local point. */
export function cellAt(x: number, y: number, cellSize: number): Cell {
  return { row: Math.floor(y / cellSize), col: Math.floor(x / cellSize) }
}
