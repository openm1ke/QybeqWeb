import { PieceSvg } from '../components/PieceSvg'
import { pieceById } from '../game/pieces'
import { themes, themeStyle, type ThemePreset } from '../cosmetics/themes'
import type { AppCopy } from '../i18n/translations'

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

export function CustomizeScreen({ selected, text, onSelect, onBack }: {
  selected: ThemePreset
  text: AppCopy
  onSelect: (theme: ThemePreset) => void
  onBack: () => void
}) {
  return (
    <main className="sub-screen customize-screen" style={themeStyle(selected)}>
      <header className="sub-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label={text.back}>←</button>
        <div><span className="eyebrow">{text.appearance}</span><h1>{text.customize}</h1></div>
        <span className="theme-badge">{text.themeName(selected.id, selected.name)}</span>
      </header>

      <section className="customize-content">
        <div className="active-preview">
          <ThemePreview theme={selected} />
          <div><span className="eyebrow">{text.livePreview}</span><h2>{text.themeName(selected.id, selected.name)}</h2><p>{text.previewDescription}</p></div>
        </div>

        <div className="customize-heading"><div><span className="eyebrow">{text.themeSets}</span><h2>{text.chooseFinish}</h2></div><span>{text.autosave}</span></div>
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
              <span className="theme-card-copy"><b>{text.themeName(theme.id, theme.name)}</b><small>{theme.price === 0 ? text.included : `${theme.price} ★ · ${text.availableInPreview}`}</small></span>
              <span className="theme-check">{selected.id === theme.id ? '✓' : '→'}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
