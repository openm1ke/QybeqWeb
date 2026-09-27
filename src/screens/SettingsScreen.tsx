import type { AudioSettings } from '../audio/audioService'
import type { AppCopy, Language } from '../i18n/translations'

export function SettingsScreen({ settings, language, text, onChange, onLanguageChange, onCustomize, onBack }: {
  settings: AudioSettings
  language: Language
  text: AppCopy
  onChange: (settings: AudioSettings) => void
  onLanguageChange: (language: Language) => void
  onCustomize: () => void
  onBack: () => void
}) {
  return (
    <main className="sub-screen settings-screen">
      <header className="sub-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label={text.back}>←</button>
        <div><span className="eyebrow">QYBEQ</span><h1>{text.settings}</h1></div>
      </header>
      <section className="settings-panel">
        <span className="eyebrow">{text.appearance}</span>
        <button className="settings-link" type="button" onClick={onCustomize}><span><b>{text.theme}</b><small>{text.themeDescription}</small></span><strong>›</strong></button>
        <label className="setting-row"><span><b>{text.language}</b><small>{text.languageDescription}</small></span><select className="language-select" aria-label={text.language} value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}><option value="en">{text.english}</option><option value="ru">{text.russian}</option></select></label>
        <span className="eyebrow settings-section-label">{text.audio}</span>
        <label className="setting-row"><span><b>{text.music}</b><small>{text.musicDescription}</small></span><input type="checkbox" checked={settings.musicEnabled} onChange={(event) => onChange({ ...settings, musicEnabled: event.target.checked })} /></label>
        <label className="setting-row volume-row"><span><b>{text.musicVolume}</b><small>{Math.round(settings.musicVolume * 100)}%</small></span><input aria-label={text.musicVolume} type="range" min="0" max="1" step="0.01" value={settings.musicVolume} disabled={!settings.musicEnabled} onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) })} /></label>
        <label className="setting-row"><span><b>{text.soundEffects}</b><small>{text.soundEffectsDescription}</small></span><input type="checkbox" checked={settings.effectsEnabled} onChange={(event) => onChange({ ...settings, effectsEnabled: event.target.checked })} /></label>
      </section>
    </main>
  )
}
