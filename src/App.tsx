import { useEffect, useState } from 'react'
import { gameAudio, loadAudioSettings, saveAudioSettings, type AudioSettings } from './audio/audioService'
import { loadTheme, saveTheme, themeStyle, type ThemePreset } from './cosmetics/themes'
import { CustomizeScreen } from './screens/CustomizeScreen'
import { GameScreen } from './screens/GameScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './App.css'

type Screen = 'menu' | 'game' | 'customize' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [theme, setTheme] = useState<ThemePreset>(loadTheme)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)

  useEffect(() => {
    gameAudio.configure(audioSettings)
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  useEffect(() => {
    const unlockAudio = () => gameAudio.unlock()
    document.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => document.removeEventListener('pointerdown', unlockAudio)
  }, [])

  const selectTheme = (nextTheme: ThemePreset) => {
    setTheme(nextTheme)
    saveTheme(nextTheme)
    gameAudio.playEffect('turn')
  }

  const startGame = () => {
    gameAudio.playEffect('dice')
    setScreen('game')
  }

  if (screen === 'game') return <GameScreen theme={theme} onBack={() => setScreen('menu')} />
  if (screen === 'customize') return <CustomizeScreen selected={theme} onSelect={selectTheme} onBack={() => setScreen('menu')} />
  if (screen === 'settings') {
    return <SettingsScreen settings={audioSettings} onChange={setAudioSettings} onCustomize={() => setScreen('customize')} onBack={() => setScreen('menu')} />
  }

  return (
    <main className="menu-screen" style={themeStyle(theme)}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="menu-topbar">
        <div className="stat"><b>0</b><span>Solved</span></div>
        <div className="stat"><b>0 ★</b><span>Stars</span></div>
        <button className="icon-button" type="button" aria-label="Settings" onClick={() => setScreen('settings')}>⚙</button>
      </header>
      <section className="hero-card">
        <span className="eyebrow">A DAILY LOGIC RITUAL</span>
        <div className="brand-lockup"><img src="./qybeq-icon.png" alt="" /><h1>QYBEQ</h1></div>
        <p>Six dice. Eight pieces. One perfect square.</p>
        <div className="menu-actions">
          <button className="primary-button" type="button" onClick={startGame}>New puzzle <span>→</span></button>
          <button className="secondary-button" type="button" onClick={() => setScreen('customize')}>Customize <span>◇</span></button>
        </div>
      </section>
      <section className="daily-card">
        <div><span className="eyebrow">DAILY CHALLENGE</span><h2>Today’s board is ready</h2><p>Build your streak and earn up to three stars.</p></div>
        <button type="button" onClick={startGame}>Play daily</button>
      </section>
      <footer className="menu-footer"><a href="./how-to-play.html">How to play</a><a href="./privacy.html">Privacy Policy</a><span>Web preview 0.2</span></footer>
    </main>
  )
}
