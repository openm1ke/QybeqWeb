/* eslint-disable react-refresh/only-export-components -- a page entry, never hot-reloaded as a module */
import { createRoot } from 'react-dom/client'
import { PieceArt } from '../src/components/GameCanvas'
import { MiniBoard } from '../src/components/MiniBoard'
import { QybeqMark } from '../src/components/QybeqMark'
import { AppearanceContext, presetAppearance } from '../src/cosmetics/appearance'
import { pieceColor, presets } from '../src/cosmetics/skins'
import { pieceById, sampleLevel } from '../src/game/pieces'
import { transformCells } from '../src/game/transforms'
import '../src/index.css'
import '../src/game.css'

/**
 * Catalog art for Yandex Games, drawn by the game's own renderers: the Q
 * mark and wordmark as on the main menu, and the board with the last two
 * pieces on their way in. `?w=800&h=470` (cover) or `?w=1560&h=520`
 * (showcase). Not part of any build.
 */
const params = new URLSearchParams(location.search)
const width = Number(params.get('w') ?? 800)
const height = Number(params.get('h') ?? 470)
const appearance = presetAppearance(presets.find((preset) => preset.id === (params.get('theme') ?? 'classic')) ?? presets[0])

function Cover() {
  const wide = width / height > 2.2
  const board = Math.round(height * (wide ? 0.8 : 0.74))
  const cell = (board - Math.round(board * 0.03) * 2 - 2) / 6
  const placed = sampleLevel.referenceSolution.slice(0, 6)
  const loose = sampleLevel.referenceSolution.slice(6)
  const markCell = height * (wide ? 0.07 : 0.062)
  return (
    <AppearanceContext.Provider value={appearance}>
      <div
        style={{
          position: 'relative',
          width,
          height,
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 70% 90% at 68% 50%, #232838 0%, #14161c 55%, #0d0e11 100%)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: wide ? width * 0.1 : width * 0.07,
            top: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: wide ? width * 0.3 : width * 0.36,
          }}
        >
          <QybeqMark cellSize={markCell} />
          <div
            style={{
              marginTop: markCell * 1.1,
              paddingLeft: '0.1em',
              fontSize: height * (wide ? 0.15 : 0.12),
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: height * 0.028,
              color: '#f2f3f5',
            }}
          >
            QYBEQ
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: wide ? width * 0.52 : width * 0.5,
            top: (height - board) / 2,
            transform: 'rotate(-6deg)',
          }}
        >
          <MiniBoard extent={board} level={sampleLevel} placed={placed} />
          {loose.map((placement, index) => {
            const piece = pieceById(placement.pieceId)
            // Hovering just above their spots, lifted and slightly turned.
            const offset = index === 0 ? { x: -0.55, y: 0.5, turn: -10 } : { x: 0.62, y: 0.35, turn: 12 }
            const padding = Math.round(board * 0.03) + 1
            return (
              <PieceArt
                key={placement.pieceId}
                cells={transformCells(piece.cells, placement.orientation)}
                color={pieceColor(appearance.pieces, placement.pieceId)}
                material={appearance.pieces.material}
                cellSize={cell}
                elevation={1}
                style={{
                  position: 'absolute',
                  left: padding + (placement.origin.col + offset.x) * cell,
                  top: padding + (placement.origin.row + offset.y) * cell,
                  transform: `rotate(${offset.turn}deg) scale(1.06)`,
                }}
              />
            )
          })}
        </div>
      </div>
    </AppearanceContext.Provider>
  )
}

document.body.style.margin = '0'
document.body.style.minHeight = '0'
createRoot(document.getElementById('root')!).render(<Cover />)
