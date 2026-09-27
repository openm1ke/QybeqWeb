import { PieceSvg } from '../components/PieceSvg'
import { pieceById } from '../game/pieces'
import { themes, themeStyle, type ThemePreset } from '../cosmetics/themes'

function ThemePreview({ theme, compact = false }: { theme: ThemePreset; compact?: boolean }) {
  return (
    <div className={`theme-preview dice-${theme.dice.surface}${compact ? ' compact' : ''}`} style={themeStyle(theme)}>
      <div className="preview-grid">
        {Array.from({ length: 16 }, (_, index) => (
          <i
            className="preview-well"
            key={index}
            style={{ gridColumn: index % 4 + 1, gridRow: Math.floor(index / 4) + 1 }}
          />
        ))}
        <div className="preview-die"><span>B2</span></div>
        <div className="preview-piece preview-piece-one">
          <PieceSvg cells={pieceById('elbow3').cells} color={theme.pieceColors.elbow3} material={theme.material} />
        </div>
        <div className="preview-piece preview-piece-two">
          <PieceSvg cells={pieceById('domino').cells} color={theme.pieceColors.domino} material={theme.material} />
        </div>
      </div>
    </div>
  )
}

export function CustomizeScreen({ selected, onSelect, onBack }: {
  selected: ThemePreset
  onSelect: (theme: ThemePreset) => void
  onBack: () => void
}) {
  return (
    <main className="sub-screen customize-screen" style={themeStyle(selected)}>
      <header className="sub-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back">←</button>
        <div><span className="eyebrow">APPEARANCE</span><h1>Customize</h1></div>
        <span className="theme-badge">{selected.name}</span>
      </header>

      <section className="customize-content">
        <div className="active-preview">
          <ThemePreview theme={selected} />
          <div><span className="eyebrow">LIVE PREVIEW</span><h2>{selected.name}</h2><p>Pieces, blockers and board update together.</p></div>
        </div>

        <div className="customize-heading"><div><span className="eyebrow">THEME SETS</span><h2>Choose a finish</h2></div><span>Changes save automatically</span></div>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              type="button"
              className={`theme-card${selected.id === theme.id ? ' selected' : ''}`}
              key={theme.id}
              onClick={() => onSelect(theme)}
              aria-pressed={selected.id === theme.id}
            >
              <ThemePreview theme={theme} compact />
              <span className="theme-card-copy"><b>{theme.name}</b><small>{theme.price === 0 ? 'Included' : `${theme.price} ★ · available in preview`}</small></span>
              <span className="theme-check">{selected.id === theme.id ? '✓' : '→'}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
