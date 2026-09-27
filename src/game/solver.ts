import { cellKey, isWithin } from './cells'
import { transformCells } from './transforms'
import type { Cell, Orientation, PieceDefinition, Placement } from './types'

interface ShapeOption {
  orientation: Orientation
  cells: Cell[]
}

function orientationsOf(piece: PieceDefinition, allowMirror: boolean): ShapeOption[] {
  const options: ShapeOption[] = []
  const seen = new Set<string>()
  const mirrors = allowMirror && piece.allowMirror ? [false, true] : [false]
  const turns = piece.allowRotation ? 4 : 1
  for (const mirrored of mirrors) {
    for (let quarterTurns = 0; quarterTurns < turns; quarterTurns += 1) {
      const orientation = { quarterTurns, mirrored }
      const cells = transformCells(piece.cells, orientation)
      const key = cells.map(cellKey).join(',')
      if (!seen.has(key)) {
        seen.add(key)
        options.push({ orientation, cells })
      }
    }
  }
  return options
}

export function solvePuzzle(options: {
  boardSize: number
  blockedCells: readonly Cell[]
  pieces: readonly PieceDefinition[]
  allowMirror?: boolean
}): Placement[] | null {
  const { boardSize, blockedCells, pieces, allowMirror = false } = options
  const freeCells = boardSize * boardSize - new Set(
    blockedCells.filter((cell) => isWithin(cell, boardSize)).map(cellKey),
  ).size
  const area = pieces.reduce((total, piece) => total + piece.cells.length, 0)
  if (area !== freeCells) return null

  const occupied = Array<boolean>(boardSize * boardSize).fill(false)
  for (const cell of blockedCells) {
    if (isWithin(cell, boardSize)) occupied[cell.row * boardSize + cell.col] = true
  }
  const optionsByPiece = pieces.map((piece) => orientationsOf(piece, allowMirror))
  const used = Array<boolean>(pieces.length).fill(false)
  const placements: Placement[] = []

  const fits = (cells: readonly Cell[], rowOffset: number, colOffset: number) => cells.every((cell) => {
    const row = cell.row + rowOffset
    const col = cell.col + colOffset
    return row >= 0 && col >= 0 && row < boardSize && col < boardSize &&
      !occupied[row * boardSize + col]
  })

  const mark = (cells: readonly Cell[], rowOffset: number, colOffset: number, value: boolean) => {
    for (const cell of cells) {
      occupied[(cell.row + rowOffset) * boardSize + cell.col + colOffset] = value
    }
  }

  const search = (from: number): boolean => {
    let index = from
    while (index < occupied.length && occupied[index]) index += 1
    if (index === occupied.length) return true
    const row = Math.floor(index / boardSize)
    const col = index % boardSize

    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
      if (used[pieceIndex]) continue
      for (const option of optionsByPiece[pieceIndex]) {
        const anchor = option.cells[0]
        const origin = { row: row - anchor.row, col: col - anchor.col }
        if (!fits(option.cells, origin.row, origin.col)) continue
        mark(option.cells, origin.row, origin.col, true)
        used[pieceIndex] = true
        placements.push({ pieceId: pieces[pieceIndex].id, origin, orientation: option.orientation })
        if (search(index + 1)) return true
        placements.pop()
        used[pieceIndex] = false
        mark(option.cells, origin.row, origin.col, false)
      }
    }
    return false
  }

  return search(0) ? placements.slice() : null
}
