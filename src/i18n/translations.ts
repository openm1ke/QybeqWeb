export type Language = 'en' | 'ru'

export interface AppCopy {
  back: string
  settings: string
  solved: string
  stars: string
  tagline: string
  newPuzzle: string
  customize: string
  dailyChallenge: string
  dailyReady: string
  dailyDescription: string
  playDaily: string
  howToPlay: string
  privacyPolicy: string
  currentStreak: string
  appearance: string
  theme: string
  themeDescription: string
  audio: string
  music: string
  musicDescription: string
  musicVolume: string
  soundEffects: string
  soundEffectsDescription: string
  privacy: string
  anonymousAnalytics: string
  anonymousAnalyticsDescription: string
  analyticsConsentTitle: string
  analyticsConsentBody: string
  allowAnalytics: string
  declineAnalytics: string
  language: string
  languageDescription: string
  english: string
  russian: string
  fillEveryCell: string
  elapsedTime: string
  rollingDice: string
  tapToSkip: string
  rotate: string
  flip: string
  reset: string
  hintsLeft: (count: number) => string
  puzzleComplete: string
  puzzleCompleteDescription: string
  continue: string
  livePreview: string
  previewDescription: string
  themeSets: string
  chooseFinish: string
  autosave: string
  included: string
  availableInPreview: string
  locked: string
  notEnoughStars: string
  placed: (count: number) => string
  streakDays: (count: number) => string
  starBalance: (count: number) => string
  unlockFor: (price: number) => string
  progressToUnlock: (current: number, price: number) => string
  unlockThemeTitle: (name: string) => string
  unlockThemeBody: (price: number, balanceAfter: number) => string
  resultStars: (count: number) => string
  themeName: (id: string, fallback: string) => string
}

const themeNames: Record<Language, Record<string, string>> = {
  en: { classic: 'Qybeq Classic', neon: 'Neon', porcelain: 'Porcelain', ember: 'Ember', prism: 'Prism' },
  ru: { classic: 'Qybeq Classic', neon: 'Неон', porcelain: 'Фарфор', ember: 'Уголь', prism: 'Призма' },
}

export const copy: Record<Language, AppCopy> = {
  en: {
    back: 'Back', settings: 'Settings', solved: 'Solved', stars: 'Stars',
    tagline: 'Six dice. Eight pieces. One perfect square.', newPuzzle: 'New puzzle', customize: 'Customize',
    dailyChallenge: 'DAILY CHALLENGE', dailyReady: 'Today’s board is ready', dailyDescription: 'Build your streak and earn up to three stars.',
    playDaily: 'Play daily', howToPlay: 'How to play', privacyPolicy: 'Privacy Policy', currentStreak: 'Current streak',
    appearance: 'APPEARANCE', theme: 'Theme', themeDescription: 'Pieces, blockers and board', audio: 'AUDIO', music: 'Music',
    musicDescription: 'Background playlist', musicVolume: 'Music volume', soundEffects: 'Sound effects',
    soundEffectsDescription: 'Pieces, dice and completion', privacy: 'PRIVACY', anonymousAnalytics: 'Anonymous analytics',
    anonymousAnalyticsDescription: 'Sessions, puzzle results and feature usage', analyticsConsentTitle: 'Help improve Qybeq?',
    analyticsConsentBody: 'Allow anonymous analytics about visits, sessions, puzzle results and feature usage. Board positions, contacts and precise location are not sent.',
    allowAnalytics: 'Allow', declineAnalytics: 'Not now', language: 'Language', languageDescription: 'Interface language',
    english: 'English', russian: 'Русский', fillEveryCell: 'Fill every free cell', elapsedTime: 'Elapsed time',
    rollingDice: 'Rolling coordinate dice…', tapToSkip: 'Tap to skip',
    rotate: 'Rotate', flip: 'Flip', reset: 'Reset', hintsLeft: (count) => `${count} hint${count === 1 ? '' : 's'} left`, puzzleComplete: 'Puzzle complete',
    puzzleCompleteDescription: 'Every free cell is filled correctly.', continue: 'Continue', livePreview: 'LIVE PREVIEW',
    previewDescription: 'Pieces, blockers and board update together.', themeSets: 'THEME SETS', chooseFinish: 'Choose a finish',
    autosave: 'Changes save automatically', included: 'Included', availableInPreview: 'available in preview', locked: 'Locked',
    notEnoughStars: 'Earn more stars by solving puzzles.', placed: (count) => `${count} of 8 placed`,
    streakDays: (count) => `${count} day${count === 1 ? '' : 's'}`, starBalance: (count) => `${count} stars available`,
    unlockFor: (price) => `Unlock for ${price} stars`, progressToUnlock: (current, price) => `${current} / ${price} stars`,
    unlockThemeTitle: (name) => `Unlock ${name}?`, unlockThemeBody: (price, balanceAfter) => `This theme costs ${price} stars. Your balance after purchase will be ${balanceAfter} stars.`,
    resultStars: (count) => `You earned ${count} star${count === 1 ? '' : 's'}.`, themeName: (id, fallback) => themeNames.en[id] ?? fallback,
  },
  ru: {
    back: 'Назад', settings: 'Настройки', solved: 'Решено', stars: 'Звёзды',
    tagline: 'Шесть кубиков. Восемь фигур. Один идеальный квадрат.', newPuzzle: 'Новая головоломка', customize: 'Оформление',
    dailyChallenge: 'ЗАДАНИЕ ДНЯ', dailyReady: 'Сегодняшняя головоломка готова', dailyDescription: 'Увеличивайте серию и получайте до трёх звёзд.',
    playDaily: 'Играть', howToPlay: 'Как играть', privacyPolicy: 'Конфиденциальность', currentStreak: 'Текущая серия',
    appearance: 'ОФОРМЛЕНИЕ', theme: 'Тема', themeDescription: 'Фигуры, блокеры и поле', audio: 'ЗВУК', music: 'Музыка',
    musicDescription: 'Фоновый плейлист', musicVolume: 'Громкость музыки', soundEffects: 'Звуковые эффекты',
    soundEffectsDescription: 'Фигуры, кубики и завершение', privacy: 'КОНФИДЕНЦИАЛЬНОСТЬ', anonymousAnalytics: 'Анонимная аналитика',
    anonymousAnalyticsDescription: 'Сессии, результаты головоломок и использование функций', analyticsConsentTitle: 'Помочь улучшить Qybeq?',
    analyticsConsentBody: 'Разрешите анонимную аналитику посещений, сессий, результатов головоломок и использования функций. Позиции на поле, контакты и точная геолокация не отправляются.',
    allowAnalytics: 'Разрешить', declineAnalytics: 'Не сейчас', language: 'Язык', languageDescription: 'Язык интерфейса',
    english: 'English', russian: 'Русский', fillEveryCell: 'Заполните все свободные клетки', elapsedTime: 'Время',
    rollingDice: 'Бросаем координатные кубики…', tapToSkip: 'Нажмите, чтобы пропустить',
    rotate: 'Повернуть', flip: 'Отразить', reset: 'Сбросить', hintsLeft: (count) => `Осталось подсказок: ${count}`, puzzleComplete: 'Головоломка решена',
    puzzleCompleteDescription: 'Все свободные клетки заполнены правильно.', continue: 'Продолжить', livePreview: 'ПРЕДПРОСМОТР',
    previewDescription: 'Фигуры, блокеры и поле меняются вместе.', themeSets: 'ТЕМЫ', chooseFinish: 'Выберите оформление',
    autosave: 'Изменения сохраняются автоматически', included: 'Доступно', availableInPreview: 'доступно в предпросмотре', locked: 'Закрыто',
    notEnoughStars: 'Заработайте больше звёзд, решая головоломки.', placed: (count) => `Размещено: ${count} из 8`,
    streakDays: (count) => `${count} дн.`, starBalance: (count) => `Доступно звёзд: ${count}`,
    unlockFor: (price) => `Открыть за ${price} звёзд`, progressToUnlock: (current, price) => `${current} / ${price} звёзд`,
    unlockThemeTitle: (name) => `Открыть «${name}»?`, unlockThemeBody: (price, balanceAfter) => `Это оформление стоит ${price} звёзд. После покупки останется ${balanceAfter} звёзд.`,
    resultStars: (count) => `Получено звёзд: ${count}.`, themeName: (id, fallback) => themeNames.ru[id] ?? fallback,
  },
}

const storageKey = 'qybeq.language.v1'

export function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'en' || saved === 'ru') return saved
  } catch { /* Optional storage. */ }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function saveLanguage(language: Language): void {
  try { localStorage.setItem(storageKey, language) } catch { /* Optional storage. */ }
}
