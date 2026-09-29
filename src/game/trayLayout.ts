/**
 * Tray slots in centred rows at the largest cell size (up to a maximum) at
 * which everything fits (mobile `TrayLayout`). Every slot is a square of
 * span × span cells, span being the piece's longest side, so rotating a
 * piece never reflows the tray.
 */
export interface SlotRect {
  readonly left: number
  readonly top: number
  readonly size: number
}

export interface TrayLayout {
  readonly cellSize: number
  readonly slots: readonly SlotRect[]
}

export const emptyTrayLayout: TrayLayout = { cellSize: 0, slots: [] }

export function computeTrayLayout(options: {
  spans: readonly number[]
  width: number
  height: number
  maxCellSize: number
  gapInCells?: number
  minGap?: number
}): TrayLayout {
  const { spans, width, height, maxCellSize, gapInCells = 0.5, minGap = 10 } = options
  if (spans.length === 0 || width <= 0 || height <= 0 || maxCellSize <= 0) return emptyTrayLayout
  const fits = (cell: number) => arrange(spans, cell, width, height, gapInCells, minGap) != null
  const best = fits(maxCellSize) ? maxCellSize : largestFitting(fits, maxCellSize)
  if (best <= 0) return emptyTrayLayout
  return { cellSize: best, slots: arrange(spans, best, width, height, gapInCells, minGap)! }
}

/** Binary search for the largest cell size that still fits. */
function largestFitting(fits: (cell: number) => boolean, max: number): number {
  let lo = 0
  let hi = max
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

function arrange(spans: readonly number[], cell: number, width: number, height: number, gapInCells: number, minGap: number): SlotRect[] | null {
  const gap = Math.max(minGap, cell * gapInCells)
  const rows: number[][] = [[]]
  let rowWidth = 0
  for (let i = 0; i < spans.length; i += 1) {
    const side = spans[i] * cell
    if (side > width) return null
    const needed = rows[rows.length - 1].length === 0 ? side : rowWidth + gap + side
    if (needed > width) {
      rows.push([i])
      rowWidth = side
    } else {
      rows[rows.length - 1].push(i)
      rowWidth = needed
    }
  }
  const rowHeights = rows.map((row) => Math.max(...row.map((i) => spans[i] * cell)))
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + gap * (rows.length - 1)
  if (totalHeight > height) return null

  const slots: SlotRect[] = new Array(spans.length)
  let y = (height - totalHeight) / 2
  rows.forEach((row, r) => {
    const rowTotal = row.reduce((sum, i) => sum + spans[i] * cell, 0) + gap * (row.length - 1)
    let x = (width - rowTotal) / 2
    for (const i of row) {
      const side = spans[i] * cell
      slots[i] = { left: x, top: y + (rowHeights[r] - side) / 2, size: side }
      x += side + gap
    }
    y += rowHeights[r] + gap
  })
  return slots
}
