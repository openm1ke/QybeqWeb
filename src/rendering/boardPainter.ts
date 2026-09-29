import type { BoardSkin, DiceSkin } from '../cosmetics/skins'
import { css, lerpColor, withAlpha, white, black, type Rgba } from './color'
import { fillPath, radialGradient, roundedRect, strokePath, verticalGradient } from './canvas'
import { cellGap, cellRadius, type Bounds } from './pieceGeometry'
import { paintDiceSurface } from './surfaceDetails'

/** Canvas ports of `BoardWellsPainter`, `BlockedCellWidget` and the dice art. */

type Ctx = CanvasRenderingContext2D

export const uiFont = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Flutter `BoxShadow.convertRadiusToSigma`. */
export function blurRadiusToSigma(radius: number): number {
  return radius > 0 ? radius * 0.57735 + 0.5 : 0
}

/** The cell rect inset by half a gap on every side. */
export function cellInset(left: number, top: number, cellSize: number): Bounds {
  const g = cellGap(cellSize) / 2
  return { left: left + g, top: top + g, right: left + cellSize - g, bottom: top + cellSize - g }
}

/**
 * Recessed cell wells with an inner shadow and a fine lip. [hidden] cells
 * (under blockers and resting pieces) get no well at all.
 */
export function paintWells(ctx: Ctx, extent: number, boardSize: number, skin: BoardSkin, hidden: ReadonlySet<string> = new Set()): void {
  const c = extent / boardSize
  const radius = cellRadius(c)
  const lip = verticalGradient(ctx, { left: 0, top: 0, right: extent, bottom: extent }, [skin.lipTop, skin.lipBottom])
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (hidden.has(`${row}:${col}`)) continue
      const rect = cellInset(col * c, row * c, c)
      const well = roundedRect(rect, radius)
      fillPath(ctx, well, skin.well)
      ctx.save()
      ctx.clip(well)
      const shadow = roundedRect(
        { left: rect.left - c * 0.06, top: rect.top + c * 0.045 - c * 0.06, right: rect.right + c * 0.06, bottom: rect.bottom + c * 0.045 + c * 0.06 },
        radius + c * 0.06,
      )
      strokePath(ctx, shadow, skin.wellShadow, c * 0.12, c * 0.05)
      ctx.restore()
      ctx.lineWidth = 1
      ctx.strokeStyle = lip
      ctx.stroke(well)
    }
  }
}

/**
 * A raised die tile filling one cell (0..cellSize) with its coordinate:
 * darker base below a lit face, the skin's surface and label.
 */
export function paintBlockedTile(ctx: Ctx, cellSize: number, label: string, skin: DiceSkin): void {
  const c = cellSize
  const outer = cellInset(0, 0, c)
  const radius = cellRadius(c)
  const edge = c * 0.05
  const base = roundedRect(outer, radius)
  fillPath(ctx, roundedRect({ ...outer, top: outer.top + c * 0.05, bottom: outer.bottom + c * 0.05 }, radius), withAlpha(black, 0.45), blurRadiusToSigma(c * 0.08))
  if (skin.glow) fillPath(ctx, base, skin.glow, blurRadiusToSigma(c * 0.16))
  fillPath(ctx, base, skin.side)
  paintDieFaceTile(ctx, { ...outer, bottom: outer.bottom - edge }, radius, c, label, skin)
}

function paintDieFaceTile(ctx: Ctx, face: Bounds, radius: number, cellSize: number, label: string, skin: DiceSkin): void {
  const path = roundedRect(face, radius)
  ctx.fillStyle = verticalGradient(ctx, face, [skin.faceTop, skin.faceBottom])
  ctx.fill(path)
  if (skin.outline) {
    const w = Math.min(1.6, Math.max(0.8, cellSize * 0.025))
    const ring = new Path2D()
    ring.addPath(path)
    ring.addPath(roundedRect({ left: face.left + w, top: face.top + w, right: face.right - w, bottom: face.bottom - w }, Math.max(0, radius - w)))
    fillPath(ctx, ring, skin.outline, 0, 'evenodd')
  }
  paintDiceSurface(ctx, face, radius, skin)
  drawLabel(ctx, label, (face.left + face.right) / 2, (face.top + face.bottom) / 2, cellSize * 0.24, cellSize * 0.01, skin.label)
}

/** The small die with five pips on the Roll Dice button ([size] square). */
export function paintDieIcon(ctx: Ctx, size: number, skin: DiceSkin): void {
  const s = size
  ctx.save()
  ctx.translate(s / 2, s / 2)
  ctx.rotate(-0.18)
  const half = (s * 0.86) / 2
  const body: Bounds = { left: -half, top: -half, right: half, bottom: half }
  fillPath(ctx, roundedRect({ ...body, top: body.top + s * 0.06, bottom: body.bottom + s * 0.06 }, s * 0.2), skin.iconSide)
  fillPath(ctx, roundedRect(body, s * 0.2), skin.faceTop)
  paintDiceSurface(ctx, body, s * 0.2, skin)
  const d = s * 0.22
  ctx.fillStyle = css(skin.pip)
  for (const [x, y] of [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]]) {
    ctx.beginPath()
    ctx.arc(x, y, s * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * One face of a tumbling die in the 100×100 reference space centred on the
 * origin. [shade] is how directly it faces the light (0..1.15).
 */
export function paintDieFace(ctx: Ctx, label: string, shade: number, skin: DiceSkin): void {
  const light = Math.min(1.1, Math.max(0, 0.3 + 0.7 * shade))
  const rect: Bounds = { left: -50, top: -50, right: 50, bottom: 50 }
  const face = roundedRect(rect, 15)
  ctx.fillStyle = verticalGradient(ctx, rect, [lerpColor(skin.shade, skin.faceTop, light), lerpColor(skin.shade, skin.faceBottom, light)])
  ctx.fill(face)
  paintDiceSurface(ctx, rect, 15, skin, Math.min(1, light))
  if (shade > 0.8) {
    ctx.fillStyle = radialGradient(ctx, rect, [-0.45, -0.55], 0.9, [withAlpha(white, (skin.sheen * (shade - 0.8)) / 0.35), withAlpha(white, 0)])
    ctx.fill(face)
  }
  ctx.lineWidth = 2
  ctx.strokeStyle = css(withAlpha(skin.rim, skin.rimAlpha * Math.min(1, light)))
  ctx.stroke(roundedRect({ left: -49, top: -49, right: 49, bottom: 49 }, 14))
  drawLabel(ctx, label, 0, 0, 26, 1, skin.label)
}

/**
 * Text laid out like a Flutter `Text` with `height: 1`, centred on
 * ([cx], [cy]). Letter spacing follows every glyph, as in Flutter.
 */
export function drawLabel(ctx: Ctx, text: string, cx: number, cy: number, fontSize: number, letterSpacing: number, color: Rgba, weight = 700): void {
  ctx.save()
  ctx.font = `${weight} ${fontSize}px ${uiFont}`
  ctx.fillStyle = css(color)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const advances = [...text].map((ch) => ctx.measureText(ch).width + letterSpacing)
  const width = advances.reduce((sum, a) => sum + a, 0)
  // A one-line box of height fontSize, centred; the baseline sits where a
  // system font's ascent puts it inside that box.
  let x = cx - width / 2
  const baseline = cy - fontSize / 2 + fontSize * 0.79
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, x, baseline)
    x += advances[i]
  })
  ctx.restore()
}
