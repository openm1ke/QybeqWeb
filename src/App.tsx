import { useCallback, useEffect, useState } from 'react'
import { gameAudio, loadAudioSettings, saveAudioSettings, type AudioSettings } from './audio/audioService'
import { loadAnalyticsPreference, setAnalyticsEnabled, trackGoal, trackPage, type AnalyticsPreference } from './analytics/metrika'
import { defaultTheme, loadTheme, saveTheme, themeStyle, type ThemePreset } from './cosmetics/themes'
import { copy, loadLanguage, saveLanguage, type AppCopy, type Language } from './i18n/translations'
import { CustomizeScreen } from './screens/CustomizeScreen'
import { GameScreen, type PuzzleCompletion } from './screens/GameScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { awardCompletion, currentDailyStreak, loadPlayerProgress, purchaseTheme, savePlayerProgress } from './progress/playerProgress'
import './App.css'

type Screen = 'menu' | 'game' | 'customize' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [progress, setProgress] = useState(loadPlayerProgress)
  const [theme, setTheme] = useState<ThemePreset>(() => {
    const saved = loadTheme()
    return progress.unlockedThemeIds.includes(saved.id) ? saved : defaultTheme
  })
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
    if (!progress.unlockedThemeIds.includes(nextTheme.id)) return
    setTheme(nextTheme)
    saveTheme(nextTheme)
    gameAudio.playEffect('turn')
    trackGoal('theme_selected', { theme_id: nextTheme.id })
  }

  const unlockTheme = (nextTheme: ThemePreset) => {
    const nextProgress = purchaseTheme(progress, nextTheme)
    if (!nextProgress) return
    setProgress(nextProgress)
    savePlayerProgress(nextProgress)
    setTheme(nextTheme)
    saveTheme(nextTheme)
    gameAudio.playEffect('complete')
    trackGoal('theme_unlocked', { theme_id: nextTheme.id, price: nextTheme.price, stars_after: nextProgress.availableStars })
    trackGoal('theme_selected', { theme_id: nextTheme.id, source: 'purchase' })
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

  const recordCompletion = useCallback((result: PuzzleCompletion) => {
    setProgress((current) => {
      const next = awardCompletion(current, gameSource, result.stars)
      savePlayerProgress(next)
      trackGoal('stars_earned', { source: gameSource, stars: result.stars, stars_after: next.availableStars, elapsed_ms: result.elapsedMs, assistance_used: result.assistanceUsed })
      return next
    })
  }, [gameSource])

  if (screen === 'game') return <GameScreen theme={theme} text={text} source={gameSource} onComplete={recordCompletion} onBack={() => setScreen('menu')} />
  if (screen === 'customize') return <CustomizeScreen selected={theme} text={text} stars={progress.availableStars} unlockedThemeIds={new Set(progress.unlockedThemeIds)} onSelect={selectTheme} onUnlock={unlockTheme} onBack={() => setScreen('menu')} />
  if (screen === 'settings') {
    return <SettingsScreen settings={audioSettings} text={text} analyticsEnabled={analyticsPreference === true} onAnalyticsChange={chooseAnalytics} onChange={setAudioSettings} onCustomize={() => { trackGoal('customization_opened', { source: 'settings' }); setScreen('customize') }} onBack={() => setScreen('menu')} />
  }

  return (
    <main className="menu-screen" style={themeStyle(theme)}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="menu-topbar">
        <LanguageSwitch language={language} text={text} onChange={setLanguage} />
        <button className="icon-button" type="button" aria-label={text.settings} onClick={() => { trackGoal('settings_opened'); setScreen('settings') }}>⚙</button>
      </header>
      <section className="hero-card">
        <div className="brand-lockup"><img src="./qybeq-icon.png" alt="" /><h1>QYBEQ</h1></div>
        <p>{text.tagline}</p>
        <div className="menu-progress-summary">
          <div className="menu-progress-value"><span aria-hidden="true">★</span><b>{progress.availableStars}</b><small>{text.stars}</small></div>
          <i />
          <div className="menu-progress-value"><span className="streak-flame" aria-hidden="true">🔥</span><b>{currentDailyStreak(progress)}</b><small>{text.currentStreak}</small></div>
        </div>
        <div className="menu-actions">
          <button className="daily-menu-button" type="button" onClick={() => startGame('daily')}><span><small>{text.dailyChallenge}</small><b>{text.dailyReady}</b></span><strong>→</strong></button>
          <button className="primary-button" type="button" onClick={() => startGame('new')}>{text.newPuzzle} <span>→</span></button>
          <button className="secondary-button" type="button" onClick={() => { trackGoal('customization_opened', { source: 'menu' }); setScreen('customize') }}>{text.customize} <span>◇</span></button>
          <a className="secondary-button menu-link-button" href="./how-to-play.html" onClick={() => trackGoal('how_to_play_opened')}>{text.howToPlay}<span>?</span></a>
        </div>
      </section>
      <footer className="menu-footer"><a href="./privacy.html">{text.privacyPolicy}</a></footer>
      {analyticsPreference === null && <section className="analytics-consent" role="dialog" aria-labelledby="analytics-consent-title">
        <div><span className="eyebrow">{text.privacy}</span><h2 id="analytics-consent-title">{text.analyticsConsentTitle}</h2><p>{text.analyticsConsentBody}</p></div>
        <div className="analytics-consent-actions"><a href="./privacy.html">{text.privacyPolicy}</a><button type="button" onClick={() => chooseAnalytics(false)}>{text.declineAnalytics}</button><button className="consent-primary" type="button" onClick={() => chooseAnalytics(true)}>{text.allowAnalytics}</button></div>
      </section>}
    </main>
  )
}

function LanguageSwitch({ language, text, onChange }: { language: Language; text: AppCopy; onChange: (language: Language) => void }) {
  return <div className="language-switch" role="group" aria-label={text.language}>
    <button type="button" aria-pressed={language === 'en'} onClick={() => onChange('en')}>{text.english}</button>
    <button type="button" aria-pressed={language === 'ru'} onClick={() => onChange('ru')}>{text.russian}</button>
  </div>
}
