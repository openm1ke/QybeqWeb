import { useCallback, useEffect, useState } from 'react'
import { gameAudio, loadAudioSettings, saveAudioSettings, type AudioSettings } from './audio/audioService'
import { loadAnalyticsPreference, setAnalyticsEnabled, trackGoal, trackPage, type AnalyticsPreference } from './analytics/metrika'
import { AppearanceContext, activePreset, loadAppearance, saveAppearance, type Appearance } from './cosmetics/appearance'
import type { ThemePreset } from './cosmetics/skins'
import { copy, loadLanguage, saveLanguage, type Language } from './i18n/translations'
import { CustomizeScreen } from './screens/CustomizeScreen'
import { GameScreen, type CompletionAward, type PuzzleCompletion } from './screens/game/GameScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { MainMenu } from './screens/MainMenu'
import { HowToPlay } from './screens/HowToPlay'
import { PrimaryAction, SecondaryAction, Sheet } from './components/ui'
import { clearSavedGame, loadSavedGame } from './game/savedGame'
import { awardCompletion, loadPlayerProgress, purchaseTheme, savePlayerProgress } from './progress/playerProgress'
import './App.css'

type Screen = 'menu' | 'game' | 'customize' | 'settings' | 'howto'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [progress, setProgress] = useState(loadPlayerProgress)
  const [appearance, setAppearance] = useState<Appearance>(() => loadAppearance(new Set(progress.unlockedThemeIds)))
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)
  const [language, setLanguage] = useState<Language>(loadLanguage)
  const [analyticsPreference, setAnalyticsPreference] = useState<AnalyticsPreference>(loadAnalyticsPreference)
  const [gameSource, setGameSource] = useState<'new' | 'daily'>('new')
  const [resumeGame, setResumeGame] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
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

  const applyAppearance = (next: Appearance) => {
    setAppearance(next)
    saveAppearance(next)
  }

  const unlockTheme = (preset: ThemePreset): boolean => {
    const nextProgress = purchaseTheme(progress, preset)
    if (!nextProgress) return false
    setProgress(nextProgress)
    savePlayerProgress(nextProgress)
    gameAudio.playEffect('complete')
    trackGoal('theme_unlocked', { theme_id: preset.id, price: preset.price, stars_after: nextProgress.availableStars })
    return true
  }

  const chooseAnalytics = (enabled: boolean) => {
    setAnalyticsPreference(enabled)
    setAnalyticsEnabled(enabled)
  }

  const startGame = (source: 'new' | 'daily', resume = false) => {
    setGameSource(source)
    setResumeGame(resume)
    setConfirmNew(false)
    setScreen('game')
  }

  const recordCompletion = useCallback((result: PuzzleCompletion): CompletionAward => {
    const next = awardCompletion(progress, gameSource, result.stars)
    setProgress(next)
    savePlayerProgress(next)
    trackGoal('stars_earned', { source: gameSource, stars: result.stars, stars_after: next.availableStars, elapsed_ms: result.elapsedMs, assistance_used: result.assistanceUsed })
    return { attemptStars: result.stars, earnedDelta: next.availableStars - progress.availableStars, availableStars: next.availableStars }
  }, [gameSource, progress])

  if (screen === 'game') {
    return (
      <AppearanceContext.Provider value={appearance}>
        <GameScreen text={text} source={gameSource} resume={resumeGame} onComplete={recordCompletion} onBack={() => setScreen('menu')} />
      </AppearanceContext.Provider>
    )
  }
  if (screen === 'customize') {
    return (
      <AppearanceContext.Provider value={appearance}>
      <CustomizeScreen
        text={text}
        appearance={appearance}
        stars={progress.availableStars}
        owned={new Set(progress.unlockedThemeIds)}
        onChange={(next, source) => {
          applyAppearance(next)
          gameAudio.playEffect('turn')
          trackGoal('theme_selected', { theme_id: activePreset(next)?.id ?? 'custom', source })
        }}
        onPurchase={unlockTheme}
        onBack={() => setScreen('menu')}
      />
      </AppearanceContext.Provider>
    )
  }
  if (screen === 'howto') {
    return (
      <AppearanceContext.Provider value={appearance}>
        <HowToPlay text={text} onDone={() => setScreen('menu')} />
      </AppearanceContext.Provider>
    )
  }
  if (screen === 'settings') {
    const preset = activePreset(appearance)
    return (
      <SettingsScreen
        settings={audioSettings}
        text={text}
        language={language}
        analyticsEnabled={analyticsPreference === true}
        appearanceDetail={preset ? text.themeName(preset.id, preset.name) : text.customMix}
        onAnalyticsChange={chooseAnalytics}
        onChange={setAudioSettings}
        onLanguage={setLanguage}
        onCustomize={() => { trackGoal('customization_opened', { source: 'settings' }); setScreen('customize') }}
        onBack={() => setScreen('menu')}
      />
    )
  }

  const saved = loadSavedGame('new')
  const savedPlaced = saved ? Object.keys(saved.snapshot.placements).length : 0
  const clock = (ms: number) => {
    const total = Math.floor(ms / 1000)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  return (
    <AppearanceContext.Provider value={appearance}>
      <MainMenu
        text={text}
        progress={progress}
        resumeDetail={saved ? text.continueDetail(savedPlaced, saved.snapshot.level.pieces.length, clock(saved.elapsedMs)) : null}
        onContinue={() => startGame('new', true)}
        onPlay={() => (saved ? setConfirmNew(true) : startGame('new'))}
        onDaily={() => startGame('daily')}
        onCustomize={() => { trackGoal('customization_opened', { source: 'menu' }); setScreen('customize') }}
        onSettings={() => { trackGoal('settings_opened'); setScreen('settings') }}
        onHowToPlay={() => { trackGoal('how_to_play_opened'); setScreen('howto') }}
        footer={<a className="menu-footer-link" href="./privacy.html">{text.privacyPolicy}</a>}
      />
      {confirmNew && (
        <Sheet label={text.newPuzzleTitle} onDismiss={() => setConfirmNew(false)}>
          <h2 className="sheet-title">{text.newPuzzleTitle}</h2>
          <p className="sheet-body">{text.newPuzzleBody}</p>
          <div className="sheet-actions">
            <PrimaryAction label={text.newPuzzle} compact onPress={() => { clearSavedGame('new'); startGame('new') }} />
            <SecondaryAction label={text.cancel} compact onPress={() => setConfirmNew(false)} />
          </div>
        </Sheet>
      )}
      {analyticsPreference === null && <section className="analytics-consent" role="dialog" aria-labelledby="analytics-consent-title">
        <div><span className="eyebrow">{text.privacy}</span><h2 id="analytics-consent-title">{text.analyticsConsentTitle}</h2><p>{text.analyticsConsentBody}</p></div>
        <div className="analytics-consent-actions"><a href="./privacy.html">{text.privacyPolicy}</a><button type="button" onClick={() => chooseAnalytics(false)}>{text.declineAnalytics}</button><button className="consent-primary" type="button" onClick={() => chooseAnalytics(true)}>{text.allowAnalytics}</button></div>
      </section>}
    </AppearanceContext.Provider>
  )
}
