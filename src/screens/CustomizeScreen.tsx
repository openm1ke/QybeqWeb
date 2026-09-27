import { useState } from 'react'
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

export function CustomizeScreen({ selected, text, stars, unlockedThemeIds, onSelect, onUnlock, onBack }: {
  selected: ThemePreset
  text: AppCopy
  stars: number
  unlockedThemeIds: ReadonlySet<string>
  onSelect: (theme: ThemePreset) => void
  onUnlock: (theme: ThemePreset) => void
  onBack: () => void
}) {
  const [notice, setNotice] = useState('')

  const choose = (theme: ThemePreset) => {
    if (unlockedThemeIds.has(theme.id) || theme.price === 0) {
      setNotice('')
      onSelect(theme)
      return
    }
    if (stars < theme.price) {
      setNotice(text.notEnoughStars)
      return
    }
    if (window.confirm(`${text.unlockThemeTitle(text.themeName(theme.id, theme.name))}\n\n${text.unlockThemeBody(theme.price, stars - theme.price)}`)) {
      setNotice('')
      onUnlock(theme)
    }
  }

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

        <div className="customize-heading"><div><span className="eyebrow">{text.themeSets}</span><h2>{text.chooseFinish}</h2></div><span className="star-balance">★ {text.starBalance(stars)}</span></div>
        {notice && <p className="customize-notice" role="status">{notice}</p>}
        <div className="theme-grid">
          {themes.map((theme) => {
            const unlocked = unlockedThemeIds.has(theme.id) || theme.price === 0
            const affordable = stars >= theme.price
            return (
              <button
                type="button"
                className={`theme-card${selected.id === theme.id ? ' selected' : ''}${unlocked ? '' : ' locked'}${!unlocked && affordable ? ' affordable' : ''}`}
                key={theme.id}
                onClick={() => choose(theme)}
                aria-pressed={selected.id === theme.id}
                aria-label={`${text.themeName(theme.id, theme.name)}, ${unlocked ? text.included : affordable ? text.unlockFor(theme.price) : text.progressToUnlock(stars, theme.price)}`}
              >
                <span className="theme-card-preview"><ThemePreview theme={theme} compact />{!unlocked && <span className="theme-lock" aria-hidden="true">🔒</span>}</span>
                <span className="theme-card-copy"><b>{text.themeName(theme.id, theme.name)}</b><small>{unlocked ? text.included : affordable ? text.unlockFor(theme.price) : text.progressToUnlock(stars, theme.price)}</small></span>
                <span className="theme-check">{selected.id === theme.id ? '✓' : unlocked ? '→' : '🔒'}</span>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
