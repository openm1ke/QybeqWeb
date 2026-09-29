import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppearanceContext, loadAppearance } from './cosmetics/appearance'
import { copy, loadLanguage, type Language } from './i18n/translations'
import { loadPlayerProgress } from './progress/playerProgress'
import { HowToPlay } from './screens/HowToPlay'
import './index.css'
import './App.css'

// The tutorial as its own page (linked from Support): the same screen as in
// the game, in the player's language and appearance. `?lang=ru|en` picks the
// language for visitors who have not opened the game yet.
const requested = new URLSearchParams(location.search).get('lang')
const language: Language = requested === 'ru' || requested === 'en' ? requested : loadLanguage()
const text = copy[language]
document.documentElement.lang = language
document.title = `Qybeq — ${text.howToPlayTitle}`
const appearance = loadAppearance(new Set(loadPlayerProgress().unlockedThemeIds))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceContext.Provider value={appearance}>
      <HowToPlay text={text} onDone={() => location.assign('./')} />
    </AppearanceContext.Provider>
  </StrictMode>,
)
