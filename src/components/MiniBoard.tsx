import type { CSSProperties, Ref } from 'react'
import { useAppearance } from '../cosmetics/appearance'
import { pieceColor } from '../cosmetics/skins'
import { absoluteCells } from '../game/controller'
import { cellKey, cellLabel } from '../game/cells'
import { transformCells } from '../game/transforms'
import type { Cell, Placement, PuzzleLevel } from '../game/types'
import { css, withAlpha } from '../rendering/color'
import { blurRadiusToSigma } from '../rendering/boardPainter'
import { BlockedTile, PieceArt, Wells } from './GameCanvas'

/**
 * A static board drawn with the real board, tile and piece renderers, in
 * the current appearance (mobile `MiniBoard`): Customize previews, How to
 * Play. Optionally shows a placement outline ([ghost]). It takes no input;
 * [gridRef] exposes the grid for a demo that drops pieces onto it.
 */
export function MiniBoard({ extent, level, placed = [], ghost = null, gridRef, style }: {
  extent: number
  level: Pick<PuzzleLevel, 'blockedCells' | 'pieces'>
  placed?: readonly Placement[]
  ghost?: Placement | null
  gridRef?: Ref<HTMLDivElement>
  style?: CSSProperties
}) {
  const appearance = useAppearance()
  const skin = appearance.board
  const padding = Math.round(extent * 0.03)
  const grid = extent - padding * 2 - 2
  const cell = grid / 6
  const snapshot = { level: { ...level, id: 'mini', boardSize: 6, referenceSolution: [] }, orientations: {}, placements: {} }
  const hidden = new Set([...level.blockedCells.map(cellKey), ...placed.flatMap((p) => absoluteCells(snapshot, p).map(cellKey))])
  const shadows = [`0 14px ${2 * blurRadiusToSigma(28)}px ${css(withAlpha(skin.shadow, skin.shadow.a * 0.5))}`]
  if (skin.frameGlow) shadows.push(`0 0 ${2 * blurRadiusToSigma(22)}px ${css(skin.frameGlow)}`)
  return (
    <div
      className="mini-board"
      aria-hidden="true"
      style={{
        width: extent,
        height: extent,
        padding,
        borderRadius: extent * 0.05,
        backgroundImage: `linear-gradient(180deg, ${css(skin.frameTop)}, ${css(skin.frameBottom)})`,
        border: `1px solid ${css(skin.frameEdge)}`,
        boxShadow: shadows.join(', '),
        ...style,
      }}
    >
      <div ref={gridRef} style={{ position: 'relative', width: grid, height: grid }}>
        <Wells extent={grid} boardSize={6} skin={skin} hidden={hidden} />
        {level.blockedCells.map((c: Cell) => (
          <BlockedTile key={cellKey(c)} cellSize={cell} label={cellLabel(c)} skin={appearance.dice} style={{ position: 'absolute', left: c.col * cell, top: c.row * cell }} />
        ))}
        {placed.map((p) => {
          const piece = level.pieces.find((value) => value.id === p.pieceId)
          if (!piece) return null
          return (
            <PieceArt
              key={p.pieceId}
              cells={transformCells(piece.cells, p.orientation)}
              color={pieceColor(appearance.pieces, p.pieceId)}
              material={appearance.pieces.material}
              cellSize={cell}
              style={{ position: 'absolute', left: p.origin.col * cell, top: p.origin.row * cell }}
            />
          )
        })}
        {ghost && <Ghost placement={ghost} level={snapshot.level} cell={cell} />}
      </div>
    </div>
  )
}

function Ghost({ placement, level, cell }: { placement: Placement; level: PuzzleLevel; cell: number }) {
  const appearance = useAppearance()
  const piece = level.pieces.find((value) => value.id === placement.pieceId)
  if (!piece) return null
  const blocked = new Set(level.blockedCells.map(cellKey))
  const shape = transformCells(piece.cells, placement.orientation)
  const conflicts = shape.filter((c) => blocked.has(cellKey({ row: c.row + placement.origin.row, col: c.col + placement.origin.col })))
  return (
    <PieceArt
      cells={shape}
      color={pieceColor(appearance.pieces, placement.pieceId)}
      material={appearance.pieces.material}
      cellSize={cell}
      pieceStyle={conflicts.length ? 'ghostInvalid' : 'ghostValid'}
      conflicts={conflicts}
      style={{ position: 'absolute', left: placement.origin.col * cell, top: placement.origin.row * cell }}
    />
  )
}
