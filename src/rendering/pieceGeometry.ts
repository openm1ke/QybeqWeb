import type { Cell } from '../game/types'

/**
 * Board and piece metrics shared by wells, tiles and pieces
 * (Flutter `CellMetrics`).
 */
export const cellGap = (cellSize: number) => cellSize * 0.075
export const cellRadius = (cellSize: number) => cellSize * 0.17

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Bounds {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

type Rect = [left: number, top: number, right: number, bottom: number]

/**
 * The outline of a piece as one solid body, exactly like Flutter's
 * `pieceBodyPath`: every cell is inset by half a gap, neighbours are joined
 * by bridges across the gap (and a centre square inside a 2×2 block), outer
 * corners are rounded with the cell radius and inner corners stay sharp.
 *
 * Returned as closed loops of corner points, traversed clockwise on screen
 * (the body is on the right-hand side).
 */
export function pieceOutline(cells: readonly Cell[], cellSize: number): Point[][] {
  const c = cellSize
  const g = cellGap(c) / 2
  const occupied = new Set(cells.map((cell) => `${cell.row}:${cell.col}`))
  const has = (row: number, col: number) => occupied.has(`${row}:${col}`)

  const rects: Rect[] = []
  for (const cell of cells) {
    const x = cell.col * c
    const y = cell.row * c
    rects.push([x + g, y + g, x + c - g, y + c - g])
    if (has(cell.row, cell.col + 1)) rects.push([x + c - g, y + g, x + c + g, y + c - g])
    if (has(cell.row + 1, cell.col)) rects.push([x + g, y + c - g, x + c - g, y + c + g])
    if (has(cell.row, cell.col + 1) && has(cell.row + 1, cell.col) && has(cell.row + 1, cell.col + 1)) {
      rects.push([x + c - g, y + c - g, x + c + g, y + c + g])
    }
  }
  return traceUnion(rects)
}

/** Bounding box of the body (the cells' bounds inset by half a gap). */
export function outlineBounds(loops: readonly Point[][]): Bounds {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const loop of loops) {
    for (const p of loop) {
      left = Math.min(left, p.x)
      top = Math.min(top, p.y)
      right = Math.max(right, p.x)
      bottom = Math.max(bottom, p.y)
    }
  }
  return { left, top, right, bottom }
}

/**
 * Adds [loops] to [path], rounding every convex corner with [radius] and
 * shifted by ([dx], [dy]).
 */
export function addRoundedLoops(
  path: Path2D | CanvasRenderingContext2D,
  loops: readonly Point[][],
  radius: number,
  dx = 0,
  dy = 0,
): void {
  for (const loop of loops) {
    const n = loop.length
    const start = midpoint(loop[0], loop[1])
    path.moveTo(start.x + dx, start.y + dy)
    for (let k = 1; k <= n; k += 1) {
      const prev = loop[(k - 1) % n]
      const v = loop[k % n]
      const next = loop[(k + 1) % n]
      const d1 = direction(prev, v)
      const d2 = direction(v, next)
      const convex = d1.x * d2.y - d1.y * d2.x > 0
      if (convex && radius > 0) {
        path.lineTo(v.x - d1.x * radius + dx, v.y - d1.y * radius + dy)
        path.arcTo(v.x + dx, v.y + dy, v.x + d2.x * radius + dx, v.y + d2.y * radius + dy, radius)
      } else {
        path.lineTo(v.x + dx, v.y + dy)
      }
    }
    path.closePath()
  }
}

const bodyCache = new Map<string, { loops: Point[][]; path: Path2D; bounds: Bounds }>()

/** Cached body path for a shape at a cell size (the floating piece redraws often). */
export function pieceBody(cells: readonly Cell[], cellSize: number) {
  const key = `${cells.map((cell) => `${cell.row}:${cell.col}`).join(',')}@${cellSize.toFixed(2)}`
  const cached = bodyCache.get(key)
  if (cached) {
    bodyCache.delete(key)
    bodyCache.set(key, cached)
    return cached
  }
  const loops = pieceOutline(cells, cellSize)
  const path = new Path2D()
  addRoundedLoops(path, loops, cellRadius(cellSize))
  const entry = { loops, path, bounds: outlineBounds(loops) }
  bodyCache.set(key, entry)
  if (bodyCache.size > 160) bodyCache.delete(bodyCache.keys().next().value!)
  return entry
}

/** The body moved by ([dx], [dy]). */
export function shiftedBody(cells: readonly Cell[], cellSize: number, dx: number, dy: number): Path2D {
  const path = new Path2D()
  addRoundedLoops(path, pieceBody(cells, cellSize).loops, cellRadius(cellSize), dx, dy)
  return path
}

function traceUnion(rects: readonly Rect[]): Point[][] {
  const xs = [...new Set(rects.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b)
  const ys = [...new Set(rects.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b)
  const cols = xs.length - 1
  const rows = ys.length - 1
  const filled = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= cols || j >= rows) return false
    const cx = (xs[i] + xs[i + 1]) / 2
    const cy = (ys[j] + ys[j + 1]) / 2
    return rects.some((r) => cx > r[0] && cx < r[2] && cy > r[1] && cy < r[3])
  }
  const grid: boolean[][] = Array.from({ length: cols }, (_, i) => Array.from({ length: rows }, (_, j) => filled(i, j)))
  const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < cols && j < rows && grid[i][j]

  // Unit edges with the body on the right-hand side (clockwise on screen).
  type Edge = { from: [number, number]; to: [number, number]; used: boolean }
  const edges: Edge[] = []
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      if (!grid[i][j]) continue
      if (!inside(i, j - 1)) edges.push({ from: [i, j], to: [i + 1, j], used: false })
      if (!inside(i + 1, j)) edges.push({ from: [i + 1, j], to: [i + 1, j + 1], used: false })
      if (!inside(i, j + 1)) edges.push({ from: [i + 1, j + 1], to: [i, j + 1], used: false })
      if (!inside(i - 1, j)) edges.push({ from: [i, j + 1], to: [i, j], used: false })
    }
  }
  const outgoing = new Map<string, Edge[]>()
  for (const edge of edges) {
    const key = `${edge.from[0]},${edge.from[1]}`
    const list = outgoing.get(key)
    if (list) list.push(edge)
    else outgoing.set(key, [edge])
  }

  const loops: Point[][] = []
  for (const first of edges) {
    if (first.used) continue
    const lattice: [number, number][] = []
    let edge: Edge | undefined = first
    let incoming: [number, number] | null = null
    while (edge && !edge.used) {
      edge.used = true
      lattice.push(edge.from)
      const dir: [number, number] = [Math.sign(edge.to[0] - edge.from[0]), Math.sign(edge.to[1] - edge.from[1])]
      incoming = dir
      const candidates: Edge[] = (outgoing.get(`${edge.to[0]},${edge.to[1]}`) ?? []).filter((e) => !e.used)
      // At a pinch point prefer the right turn, keeping each body separate.
      edge = candidates.sort((a, b) => turnRank(incoming!, a) - turnRank(incoming!, b))[0]
    }
    const points = simplify(lattice.map(([i, j]) => ({ x: xs[i], y: ys[j] })))
    if (points.length >= 4) loops.push(points)
  }
  return loops
}

function turnRank(incoming: [number, number], edge: { from: [number, number]; to: [number, number] }): number {
  const dx = Math.sign(edge.to[0] - edge.from[0])
  const dy = Math.sign(edge.to[1] - edge.from[1])
  const cross = incoming[0] * dy - incoming[1] * dx
  return cross > 0 ? 0 : cross === 0 ? 1 : 2
}

/** Drops points that lie on a straight run. */
function simplify(points: Point[]): Point[] {
  const n = points.length
  return points.filter((p, k) => {
    const prev = points[(k - 1 + n) % n]
    const next = points[(k + 1) % n]
    return (p.x - prev.x) * (next.y - p.y) - (p.y - prev.y) * (next.x - p.x) !== 0
  })
}

function direction(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
