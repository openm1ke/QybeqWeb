import { cellKey, isWithin } from './cells'
import {
  flipOrientationHorizontally,
  rotateOrientationClockwise,
  transformCells,
} from './transforms'
import type { Cell, GameSnapshot, Orientation, Placement, PlacementCheck, PuzzleLevel } from './types'
import { identityOrientation } from './types'

export function initialSnapshot(level: PuzzleLevel): GameSnapshot {
  return { level, orientations: {}, placements: {} }
}

export function orientationOf(snapshot: GameSnapshot, pieceId: string): Orientation {
  return snapshot.orientations[pieceId] ?? identityOrientation
}

export function absoluteCells(snapshot: GameSnapshot, placement: Placement): Cell[] {
  const piece = snapshot.level.pieces.find((value) => value.id === placement.pieceId)
  if (!piece) throw new Error(`Unknown piece: ${placement.pieceId}`)
  return transformCells(piece.cells, placement.orientation).map((cell) => ({
    row: cell.row + placement.origin.row,
    col: cell.col + placement.origin.col,
  }))
}

export function checkPlacement(
  snapshot: GameSnapshot,
  pieceId: string,
  origin: Cell,
  orientation = orientationOf(snapshot, pieceId),
): PlacementCheck {
  const piece = snapshot.level.pieces.find((value) => value.id === pieceId)
  if (!piece) throw new Error(`Unknown piece: ${pieceId}`)
  const cells = transformCells(piece.cells, orientation).map((cell) => ({
    row: cell.row + origin.row,
    col: cell.col + origin.col,
  }))
  const blockedKeys = new Set(snapshot.level.blockedCells.map(cellKey))
  const occupiedKeys = new Set(Object.values(snapshot.placements)
    .filter((placement) => placement.pieceId !== pieceId)
    .flatMap((placement) => absoluteCells(snapshot, placement).map(cellKey)))
  const outOfBounds = cells.filter((cell) => !isWithin(cell, snapshot.level.boardSize))
  const blocked = cells.filter((cell) => blockedKeys.has(cellKey(cell)))
  const overlapping = cells.filter((cell) => occupiedKeys.has(cellKey(cell)))
  return {
    cells,
    outOfBounds,
    blocked,
    overlapping,
    isValid: outOfBounds.length === 0 && blocked.length === 0 && overlapping.length === 0,
  }
}

export function placePiece(snapshot: GameSnapshot, pieceId: string, origin: Cell): GameSnapshot {
  const orientation = orientationOf(snapshot, pieceId)
  if (!checkPlacement(snapshot, pieceId, origin, orientation).isValid) return snapshot
  return {
    ...snapshot,
    placements: {
      ...snapshot.placements,
      [pieceId]: { pieceId, origin, orientation },
    },
  }
}

export function removePiece(snapshot: GameSnapshot, pieceId: string): GameSnapshot {
  if (!snapshot.placements[pieceId]) return snapshot
  const placements = { ...snapshot.placements }
  delete placements[pieceId]
  return { ...snapshot, placements }
}

function reorient(snapshot: GameSnapshot, pieceId: string, orientation: Orientation): GameSnapshot {
  const current = snapshot.placements[pieceId]
  if (current && !checkPlacement(snapshot, pieceId, current.origin, orientation).isValid) return snapshot
  return {
    ...snapshot,
    orientations: { ...snapshot.orientations, [pieceId]: orientation },
    placements: current
      ? { ...snapshot.placements, [pieceId]: { ...current, orientation } }
      : snapshot.placements,
  }
}

export function rotatePiece(snapshot: GameSnapshot, pieceId: string): GameSnapshot {
  const piece = snapshot.level.pieces.find((value) => value.id === pieceId)
  if (!piece?.allowRotation) return snapshot
  return reorient(snapshot, pieceId, rotateOrientationClockwise(orientationOf(snapshot, pieceId)))
}

export function flipPiece(snapshot: GameSnapshot, pieceId: string): GameSnapshot {
  const piece = snapshot.level.pieces.find((value) => value.id === pieceId)
  if (!piece?.allowMirror) return snapshot
  return reorient(snapshot, pieceId, flipOrientationHorizontally(orientationOf(snapshot, pieceId)))
}

export function isSolved(snapshot: GameSnapshot): boolean {
  if (Object.keys(snapshot.placements).length !== snapshot.level.pieces.length) return false
  const covered = new Set<string>()
  const blocked = new Set(snapshot.level.blockedCells.map(cellKey))
  for (const placement of Object.values(snapshot.placements)) {
    for (const cell of absoluteCells(snapshot, placement)) {
      const key = cellKey(cell)
      if (!isWithin(cell, snapshot.level.boardSize) || blocked.has(key) || covered.has(key)) return false
      covered.add(key)
    }
  }
  return covered.size === snapshot.level.boardSize ** 2 - blocked.size
}

export function applyReferenceSolution(snapshot: GameSnapshot): GameSnapshot {
  const placements = Object.fromEntries(snapshot.level.referenceSolution.map((value) => [value.pieceId, value]))
  const orientations = Object.fromEntries(snapshot.level.referenceSolution.map((value) => [value.pieceId, value.orientation]))
  return { ...snapshot, placements, orientations }
}
