/**
 * Board sizing of the mobile game screen (`_BoardMetrics`): about 92% of
 * the width, capped for tablets and short screens, with the grid snapped so
 * a cell is a whole number of device pixels.
 *
 * Wide viewports (landscape tablets, desktop) put the tray beside the board
 * instead of under it; the board keeps the same proportions.
 */
export interface GameLayout {
  readonly wide: boolean
  readonly extent: number
  readonly framePadding: number
  readonly cellSize: number
  /** Width of the column holding the tray (and, on phones, everything). */
  readonly columnWidth: number
}

export const headerHeight = 56
export const trayBarHeight = 36
export const maxExtent = 560

export function resolveLayout(width: number, height: number, pixelRatio: number): GameLayout {
  const wide = width >= 760 && width / Math.max(1, height) >= 1.1
  const raw = wide
    ? Math.min(maxExtent, (width - 72) * 0.52, height - (8 + headerHeight + 12 + 14 + trayBarHeight + 24))
    : Math.min(Math.min(width * 0.92, maxExtent), height * 0.54)
  const padding = Math.round(raw * 0.03)
  const cellPx = Math.floor(((raw - 2 * padding) * pixelRatio) / 6)
  const cellSize = Math.max(1, cellPx) / pixelRatio
  const extent = cellSize * 6 + 2 * padding
  return {
    wide,
    extent,
    framePadding: padding,
    cellSize,
    columnWidth: wide ? Math.min(extent, width - extent - 72) : extent,
  }
}
