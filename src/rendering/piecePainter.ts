import type { Cell } from '../game/types'
import type { PieceMaterial } from '../cosmetics/skins'
import { argb, black, css, lerpColor, shade, white, withAlpha, withLightness, type Rgba } from './color'
import {
  drawScratch,
  fillPath,
  linearGradient,
  roundedRect,
  scratchLike,
  strokePath,
  verticalGradient,
} from './canvas'
import { cellGap, cellRadius, pieceBody, shiftedBody } from './pieceGeometry'
import { paintPieceSurface } from './surfaceDetails'

/**
 * Canvas port of the mobile `PiecePainter`. Every piece is drawn from its
 * normalised cells as one continuous body; there is no per-shape artwork.
 */

export type PieceStyle = 'solid' | 'ghostValid' | 'ghostInvalid' | 'hint' | 'hintSource'

export interface PiecePaint {
  cells: readonly Cell[]
  color: Rgba
  cellSize: number
  material: PieceMaterial
  style?: PieceStyle
  /** 0 = resting, 1 = lifted under the finger. */
  elevation?: number
  /** 0..1 selection glow. */
  glow?: number
  /** 0..1 extra brightness (snap flash, solved pulse). */
  highlight?: number
  /** Optional colour wash (e.g. red for an illegal drop). */
  tint?: Rgba | null
  /** Piece-local cells to mark as conflicting (invalid ghost only). */
  conflicts?: readonly Cell[]
}

export const invalidColor = argb(0xffff4d5e)

type Ctx = CanvasRenderingContext2D

export function paintPiece(ctx: Ctx, paint: PiecePaint): void {
  if (paint.cells.length === 0 || paint.cellSize <= 0) return
  const p = normalise(paint)
  switch (p.style) {
    case 'solid':
      if (p.material.finish === 'legacy') paintLegacy(ctx, p)
      else if (p.material.finish === 'neon') paintNeon(ctx, p)
      else paintGloss(ctx, p)
      break
    case 'ghostValid':
      paintGhostValid(ctx, p)
      break
    case 'ghostInvalid':
      paintGhostInvalid(ctx, p)
      break
    case 'hint':
      paintHint(ctx, p)
      break
    case 'hintSource':
      paintHintSource(ctx, p)
      break
  }
}

/** Neon: the dark body colour. */
export function neonCore(color: Rgba, material: PieceMaterial): Rgba {
  return withLightness(color, material.core)
}

/** Neon: the rim colour. */
export function neonRim(color: Rgba, material: PieceMaterial): Rgba {
  return lerpColor(color, white, material.rimLift)
}

type Resolved = Required<Omit<PiecePaint, 'tint'>> & { tint: Rgba | null }

function normalise(paint: PiecePaint): Resolved {
  return {
    style: 'solid',
    elevation: 0,
    glow: 0,
    highlight: 0,
    conflicts: [],
    ...paint,
    tint: paint.tint ?? null,
  }
}

/** The original faceted look, used only by the Q mark. */
function paintLegacy(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const { path: body, bounds } = pieceBody(p.cells, c)
  const { color, elevation, glow } = p

  if (glow > 0) fillPath(ctx, body, withAlpha(color, 0.55 * glow), c * 0.24)
  fillPath(ctx, shiftedBody(p.cells, c, 0, c * (0.05 + 0.22 * elevation)), withAlpha(black, 0.42 + 0.12 * elevation), c * (0.06 + 0.16 * elevation))
  fillPath(ctx, shiftedBody(p.cells, c, 0, c * 0.045), shade(color, -0.2))
  ctx.fillStyle = verticalGradient(ctx, bounds, [shade(color, 0.07), color, shade(color, -0.05)], [0, 0.55, 1])
  ctx.fill(body)

  const facetWidth = clamp(c * 0.022, 0.6, 2)
  for (const cell of p.cells) {
    const inset = c * 0.13
    const facet = {
      left: cell.col * c + inset,
      top: cell.row * c + inset,
      right: (cell.col + 1) * c - inset,
      bottom: (cell.row + 1) * c - inset,
    }
    ctx.lineWidth = facetWidth
    ctx.strokeStyle = css(withAlpha(black, 0.1))
    ctx.stroke(roundedRect({ ...facet, top: facet.top + c * 0.012, bottom: facet.bottom + c * 0.012 }, c * 0.11))
    ctx.strokeStyle = css(withAlpha(white, 0.16))
    ctx.stroke(roundedRect(facet, c * 0.11))
  }

  ctx.lineWidth = clamp(c * 0.03, 0.8, 2.4)
  ctx.strokeStyle = verticalGradient(ctx, bounds, [withAlpha(white, 0.45), withAlpha(white, 0)], [0, 0.35])
  ctx.stroke(body)
  paintAbove(ctx, p, body)
}

/** Polished plastic (and the ceramic, satin metal and crystal finishes). */
function paintGloss(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const m = p.material
  const { path: body, bounds } = pieceBody(p.cells, c)
  const color = p.color

  paintBeneath(ctx, p, body)
  fillPath(ctx, shiftedBody(p.cells, c, 0, c * m.depth), shade(color, -m.depthShade))
  ctx.fillStyle = verticalGradient(ctx, bounds, [shade(color, m.faceLift), color, shade(color, -m.faceDrop)], [0, 0.5, 1])
  ctx.fill(body)

  ctx.save()
  ctx.clip(body)
  // One sheen over the whole piece; it only varies vertically, so it can
  // never outline a cell or a joint.
  ctx.fillStyle = verticalGradient(
    ctx,
    bounds,
    [withAlpha(white, m.sheen), withAlpha(white, m.sheen * 0.3), withAlpha(white, 0)],
    [0, m.sheenDepth * 0.5, m.sheenDepth],
  )
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)

  paintPieceSurface(ctx, body, bounds, p.cells, c, m.finish, color)

  // Shaded lower edges, then bright upper edges (a touch stronger to the left).
  edgeBand(ctx, p.cells, c, -m.shadeWidth, c * 0.03, withAlpha(black, m.edgeShade))
  edgeBand(ctx, p.cells, c, m.edgeWidth, c * 0.015, white, (scratch) =>
    linearGradient(scratch, bounds, [withAlpha(white, m.edgeLight), withAlpha(white, m.edgeLight * 0.6)]),
  )
  ctx.restore()

  ctx.lineWidth = clamp(c * 0.025, 0.8, 2)
  ctx.strokeStyle = verticalGradient(ctx, bounds, [withAlpha(white, m.rim), withAlpha(white, 0)], [0, 0.4])
  ctx.stroke(body)
  paintAbove(ctx, p, body)
}

/** Dark lacquer with a lit edge. */
function paintNeon(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const m = p.material
  const { path: body, bounds } = pieceBody(p.cells, c)
  const color = p.color
  const core = neonCore(color, m)

  paintBeneath(ctx, p, body)
  strokePath(ctx, body, withAlpha(color, m.halo), c * 0.08, c * 0.1)
  fillPath(ctx, shiftedBody(p.cells, c, 0, c * m.depth), shade(core, -m.depthShade))
  ctx.fillStyle = verticalGradient(ctx, bounds, [shade(core, m.faceLift), core, shade(core, -m.faceDrop)], [0, 0.5, 1])
  ctx.fill(body)

  ctx.save()
  ctx.clip(body)
  strokePath(ctx, body, withAlpha(color, m.innerGlow), c * m.innerGlowWidth, c * 0.07)
  ctx.fillStyle = verticalGradient(ctx, bounds, [withAlpha(white, m.sheen), withAlpha(white, 0)], [0, m.sheenDepth])
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)
  ctx.restore()

  const rim = neonRim(color, m)
  ctx.lineWidth = clamp(c * m.rimWidth, 1, 3)
  ctx.strokeStyle = verticalGradient(ctx, bounds, [lerpColor(rim, white, 0.35), rim])
  ctx.stroke(body)
  paintAbove(ctx, p, body)
}

/** Selection halo and drop shadow, under a solid piece. */
function paintBeneath(ctx: Ctx, p: Resolved, body: Path2D): void {
  const c = p.cellSize
  if (p.glow > 0) fillPath(ctx, body, withAlpha(p.color, 0.55 * p.glow), c * 0.24)
  fillPath(
    ctx,
    shiftedBody(p.cells, c, 0, c * (0.05 + 0.22 * p.elevation)),
    withAlpha(black, 0.42 + 0.12 * p.elevation),
    c * (0.06 + 0.16 * p.elevation),
  )
}

/** Snap/solve highlight, tint and selection rim, over a solid piece. */
function paintAbove(ctx: Ctx, p: Resolved, body: Path2D): void {
  const c = p.cellSize
  if (p.highlight > 0) fillPath(ctx, body, withAlpha(white, 0.35 * p.highlight))
  if (p.tint) fillPath(ctx, body, p.tint)
  if (p.glow > 0) strokePath(ctx, body, withAlpha(white, 0.4 * p.glow), clamp(c * 0.035, 1, 2.5))
}

/**
 * The strip of the body along its horizontal edges (`pieceEdgeBand`): with
 * a positive [depth] the edges facing up, with a negative one those facing
 * down. Painted blurred by [sigma], like the mobile mask filter.
 */
function edgeBand(
  ctx: Ctx,
  cells: readonly Cell[],
  cellSize: number,
  depth: number,
  sigma: number,
  color: Rgba,
  shader?: (scratch: Ctx) => CanvasGradient,
): void {
  const scratch = scratchLike(ctx)
  scratch.fillStyle = shader ? shader(scratch) : '#fff'
  scratch.fill(pieceBody(cells, cellSize).path)
  scratch.globalCompositeOperation = 'destination-out'
  scratch.fillStyle = '#000'
  scratch.fill(shiftedBody(cells, cellSize, 0, depth * cellSize))
  // The band's alpha (a gradient's included) carries over; the blur supplies
  // the colour.
  drawScratch(ctx, scratch, sigma, color)
}

function paintGhostValid(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const { path: body } = pieceBody(p.cells, c)
  fillPath(ctx, body, withAlpha(p.color, 0.5), c * 0.16)
  fillPath(ctx, body, withAlpha(p.color, 0.38))
  strokePath(ctx, body, lerpColor(p.color, white, 0.55), clamp(c * 0.04, 1.5, 3))
}

function paintGhostInvalid(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const { path: body } = pieceBody(p.cells, c)
  fillPath(ctx, body, withAlpha(invalidColor, 0.14))
  const inset = cellGap(c) / 2
  for (const cell of p.conflicts) {
    fillPath(
      ctx,
      roundedRect(
        { left: cell.col * c + inset, top: cell.row * c + inset, right: (cell.col + 1) * c - inset, bottom: (cell.row + 1) * c - inset },
        cellRadius(c),
      ),
      withAlpha(invalidColor, 0.45),
    )
  }
  strokePath(ctx, body, withAlpha(invalidColor, 0.9), clamp(c * 0.035, 1.2, 3))
}

/** A dashed outline with a faint fill in the piece's colour. */
function paintHint(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const { path: body } = pieceBody(p.cells, c)
  if (p.glow > 0) fillPath(ctx, body, withAlpha(p.color, 0.45 * p.glow), c * 0.2)
  fillPath(ctx, body, withAlpha(p.color, 0.2))
  dashed(ctx, body, c, lerpColor(p.color, white, 0.45), clamp(c * 0.045, 1.5, 3))
}

/** A dashed light ring over a placed piece that has to move. */
function paintHintSource(ctx: Ctx, p: Resolved): void {
  const c = p.cellSize
  const { path: body } = pieceBody(p.cells, c)
  if (p.glow > 0) strokePath(ctx, body, withAlpha(white, 0.35 * p.glow), c * 0.12, c * 0.08)
  dashed(ctx, body, c, withAlpha(white, 0.9), clamp(c * 0.045, 1.5, 3))
}

function dashed(ctx: Ctx, body: Path2D, cellSize: number, color: Rgba, width: number): void {
  ctx.save()
  ctx.setLineDash([cellSize * 0.16, cellSize * 0.11])
  ctx.lineCap = 'round'
  ctx.lineWidth = width
  ctx.strokeStyle = css(color)
  ctx.stroke(body)
  ctx.restore()
}

/** Blurred shapes reach this far past a piece's cells (in cells). */
export function pieceOverflow(elevation: number, glow: number): number {
  return Math.max(0.5, 0.05 + 0.22 * elevation + 3 * (0.06 + 0.16 * elevation), glow > 0 ? 0.75 : 0)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
