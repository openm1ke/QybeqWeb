import type { Cell } from './types'

const cellPattern = /^([A-Z])([1-9][0-9]*)$/

export function parseCell(label: string): Cell {
  const match = cellPattern.exec(label.trim().toUpperCase())
  if (!match) throw new Error(`Invalid cell label: ${label}`)
  return { row: match[1].charCodeAt(0) - 65, col: Number(match[2]) - 1 }
}

export function cellLabel(cell: Cell): string {
  return `${String.fromCharCode(65 + cell.row)}${cell.col + 1}`
}

export function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.col}`
}

export function compareCells(a: Cell, b: Cell): number {
  return a.row === b.row ? a.col - b.col : a.row - b.row
}

export function isWithin(cell: Cell, boardSize: number): boolean {
  return cell.row >= 0 && cell.col >= 0 && cell.row < boardSize && cell.col < boardSize
}
