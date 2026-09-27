import { useEffect, useState } from 'react'
import { gameAudio, loadAudioSettings, saveAudioSettings, type AudioSettings } from './audio/audioService'
import { loadAnalyticsPreference, setAnalyticsEnabled, trackGoal, trackPage, type AnalyticsPreference } from './analytics/metrika'
import { loadTheme, saveTheme, themeStyle, type ThemePreset } from './cosmetics/themes'
import { copy, loadLanguage, saveLanguage, type Language } from './i18n/translations'
import { CustomizeScreen } from './screens/CustomizeScreen'
import { GameScreen } from './screens/GameScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './App.css'

type Screen = 'menu' | 'game' | 'customize' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [theme, setTheme] = useState<ThemePreset>(loadTheme)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)
  const [language, setLanguage] = useState<Language>(loadLanguage)
  const [analyticsPreference, setAnalyticsPreference] = useState<AnalyticsPreference>(loadAnalyticsPreference)
  const [gameSource, setGameSource] = useState<'new' | 'daily'>('new')
  const text = copy[language]

  useEffect(() => {
    gameAudio.configure(audioSettings)
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  useEffect(() => {
    const unlockAudio = () => gameAudio.unlock()
    document.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => document.removeEventListener('pointerdown', unlockAudio)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    saveLanguage(language)
  }, [language])

  useEffect(() => {
    if (analyticsPreference !== null) setAnalyticsEnabled(analyticsPreference)
  }, [analyticsPreference])

  useEffect(() => {
    if (analyticsPreference) trackPage(screen)
  }, [analyticsPreference, screen])

  const selectTheme = (nextTheme: ThemePreset) => {
    setTheme(nextTheme)
    saveTheme(nextTheme)
    gameAudio.playEffect('turn')
    trackGoal('theme_selected', { theme_id: nextTheme.id })
  }

  const chooseAnalytics = (enabled: boolean) => {
    setAnalyticsPreference(enabled)
    setAnalyticsEnabled(enabled)
  }

  const startGame = (source: 'new' | 'daily') => {
    gameAudio.playEffect('dice')
    setGameSource(source)
    trackGoal('dice_roll_started', { source })
    setScreen('game')
  }

  if (screen === 'game') return <GameScreen theme={theme} text={text} source={gameSource} onBack={() => setScreen('menu')} />
  if (screen === 'customize') return <CustomizeScreen selected={theme} text={text} onSelect={selectTheme} onBack={() => setScreen('menu')} />
  if (screen === 'settings') {
    return <SettingsScreen settings={audioSettings} language={language} text={text} analyticsEnabled={analyticsPreference === true} onLanguageChange={setLanguage} onAnalyticsChange={chooseAnalytics} onChange={setAudioSettings} onCustomize={() => { trackGoal('customization_opened', { source: 'settings' }); setScreen('customize') }} onBack={() => setScreen('menu')} />
  }

  return (
    <main className="menu-screen" style={themeStyle(theme)}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="menu-topbar">
        <div className="stat"><b>0</b><span>{text.solved}</span></div>
        <div className="stat"><b>0 ★</b><span>{text.stars}</span></div>
        <button className="icon-button" type="button" aria-label={text.settings} onClick={() => { trackGoal('settings_opened'); setScreen('settings') }}>⚙</button>
      </header>
      <section className="hero-card">
        <span className="eyebrow">{text.ritual}</span>
        <div className="brand-lockup"><img src="./qybeq-icon.png" alt="" /><h1>QYBEQ</h1></div>
        <p>{text.tagline}</p>
        <div className="menu-actions">
          <button className="primary-button" type="button" onClick={() => startGame('new')}>{text.newPuzzle} <span>→</span></button>
          <button className="secondary-button" type="button" onClick={() => { trackGoal('customization_opened', { source: 'menu' }); setScreen('customize') }}>{text.customize} <span>◇</span></button>
        </div>
      </section>
      <section className="daily-card">
        <div><span className="eyebrow">{text.dailyChallenge}</span><h2>{text.dailyReady}</h2><p>{text.dailyDescription}</p></div>
        <button type="button" onClick={() => startGame('daily')}>{text.playDaily}</button>
      </section>
      <footer className="menu-footer"><a href="./how-to-play.html">{text.howToPlay}</a><a href="./privacy.html">{text.privacyPolicy}</a><span>{text.webPreview}</span></footer>
      {analyticsPreference === null && <section className="analytics-consent" role="dialog" aria-labelledby="analytics-consent-title">
        <div><span className="eyebrow">{text.privacy}</span><h2 id="analytics-consent-title">{text.analyticsConsentTitle}</h2><p>{text.analyticsConsentBody}</p></div>
        <div className="analytics-consent-actions"><a href="./privacy.html">{text.privacyPolicy}</a><button type="button" onClick={() => chooseAnalytics(false)}>{text.declineAnalytics}</button><button className="consent-primary" type="button" onClick={() => chooseAnalytics(true)}>{text.allowAnalytics}</button></div>
      </section>}
    </main>
  )
}
