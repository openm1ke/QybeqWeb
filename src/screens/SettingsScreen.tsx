import type { AudioSettings } from '../audio/audioService'

export function SettingsScreen({ settings, onChange, onCustomize, onBack }: {
  settings: AudioSettings
  onChange: (settings: AudioSettings) => void
  onCustomize: () => void
  onBack: () => void
}) {
  return (
    <main className="sub-screen settings-screen">
      <header className="sub-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back">←</button>
        <div><span className="eyebrow">QYBEQ</span><h1>Settings</h1></div>
      </header>
      <section className="settings-panel">
        <span className="eyebrow">APPEARANCE</span>
        <button className="settings-link" type="button" onClick={onCustomize}><span><b>Theme</b><small>Pieces, blockers and board</small></span><strong>›</strong></button>
        <span className="eyebrow settings-section-label">AUDIO</span>
        <label className="setting-row"><span><b>Music</b><small>Background playlist</small></span><input type="checkbox" checked={settings.musicEnabled} onChange={(event) => onChange({ ...settings, musicEnabled: event.target.checked })} /></label>
        <label className="setting-row volume-row"><span><b>Music volume</b><small>{Math.round(settings.musicVolume * 100)}%</small></span><input aria-label="Music volume" type="range" min="0" max="1" step="0.01" value={settings.musicVolume} disabled={!settings.musicEnabled} onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) })} /></label>
        <label className="setting-row"><span><b>Sound effects</b><small>Pieces, dice and completion</small></span><input type="checkbox" checked={settings.effectsEnabled} onChange={(event) => onChange({ ...settings, effectsEnabled: event.target.checked })} /></label>
      </section>
    </main>
  )
}
