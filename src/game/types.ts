export interface Cell {
  readonly row: number
  readonly col: number
}

export interface Orientation {
  readonly quarterTurns: number
  readonly mirrored: boolean
}

export interface PieceDefinition {
  readonly id: string
  readonly name: string
  readonly cells: readonly Cell[]
  readonly allowRotation: boolean
  readonly allowMirror: boolean
}

export interface Placement {
  readonly pieceId: string
  readonly origin: Cell
  readonly orientation: Orientation
}

export interface PuzzleLevel {
  readonly id: string
  readonly boardSize: number
  readonly blockedCells: readonly Cell[]
  readonly pieces: readonly PieceDefinition[]
  readonly referenceSolution: readonly Placement[]
}

export interface GameSnapshot {
  readonly level: PuzzleLevel
  readonly orientations: Readonly<Record<string, Orientation>>
  readonly placements: Readonly<Record<string, Placement>>
}

export interface PlacementCheck {
  readonly cells: readonly Cell[]
  readonly outOfBounds: readonly Cell[]
  readonly blocked: readonly Cell[]
  readonly overlapping: readonly Cell[]
  readonly isValid: boolean
}

export const identityOrientation: Orientation = {
  quarterTurns: 0,
  mirrored: false,
}
