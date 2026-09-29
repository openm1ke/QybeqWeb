import { BlockedTile, PieceArt, Wells } from '../components/GameCanvas'
import { boardSkins, diceSkins, materials, pieceColor, pieceSkins } from '../cosmetics/skins'
import { pieces } from '../game/pieces'
import { argb, withAlpha } from '../rendering/color'
import { invalidColor } from '../rendering/piecePainter'

/** Development-only sheet mirroring the mobile `piece_material` golden. */
export function RenderLab() {
  const classic = pieceSkins[0]
  const flare = pieces.find((p) => p.id === 'flare')!
  const elbow4 = pieces.find((p) => p.id === 'elbow4')!
  const pad = (c: number) => ({ margin: c * 0.3 })
  return (
    <div style={{ background: '#0D0E11', padding: 8, color: '#fff', width: 400 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {pieces.map((p) => <PieceArt key={p.id} cells={p.cells} color={pieceColor(classic, p.id)} material={classic.material} cellSize={32} style={pad(32)} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} elevation={1} style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} glow={1} style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} highlight={0.55} style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} tint={withAlpha(invalidColor, 0.42)} style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} pieceStyle="ghostValid" style={pad(30)} />
        <PieceArt cells={flare.cells} color={pieceColor(classic, 'flare')} material={classic.material} cellSize={30} pieceStyle="ghostInvalid" conflicts={[{ row: 1, col: 0 }]} style={pad(30)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {pieces.map((p) => <PieceArt key={p.id} cells={p.cells} color={pieceColor(classic, p.id)} material={classic.material} cellSize={22} style={pad(22)} />)}
      </div>
      <div style={{ display: 'flex' }}>
        <PieceArt cells={elbow4.cells} color={pieceColor(classic, 'elbow4')} material={materials.brand} cellSize={48} style={pad(48)} />
        <PieceArt cells={elbow4.cells} color={pieceColor(classic, 'elbow4')} material={classic.material} cellSize={48} style={pad(48)} />
      </div>
      {pieceSkins.slice(1).map((skin) => (
        <div key={skin.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {pieces.map((p) => <PieceArt key={p.id} cells={p.cells} color={pieceColor(skin, p.id)} material={skin.material} cellSize={32} style={pad(32)} />)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {diceSkins.map((skin) => <BlockedTile key={skin.id} cellSize={56} label="B2" skin={skin} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
        {boardSkins.map((skin) => (
          <div key={skin.id} style={{ position: 'relative', width: 120, height: 120, borderRadius: 6, background: `linear-gradient(${'#' + ''}${'000'}, ${'#000'})` }}>
            <Wells extent={120} boardSize={6} skin={skin} hidden={new Set(['1:1'])} />
          </div>
        ))}
      </div>
      <span style={{ color: '#888', fontSize: 11 }}>{String(argb(0xff000000).a)}</span>
    </div>
  )
}
