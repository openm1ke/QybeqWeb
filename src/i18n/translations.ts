export type Language = 'en' | 'ru'

export interface AppCopy {
  back: string
  settings: string
  solved: string
  stars: string
  ritual: string
  tagline: string
  newPuzzle: string
  customize: string
  dailyChallenge: string
  dailyReady: string
  dailyDescription: string
  playDaily: string
  howToPlay: string
  privacyPolicy: string
  webPreview: string
  appearance: string
  theme: string
  themeDescription: string
  audio: string
  music: string
  musicDescription: string
  musicVolume: string
  soundEffects: string
  soundEffectsDescription: string
  language: string
  languageDescription: string
  english: string
  russian: string
  fillEveryCell: string
  elapsedTime: string
  rotate: string
  flip: string
  reset: string
  previewSolution: string
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
  placed: (count: number) => string
  themeName: (id: string, fallback: string) => string
}

const themeNames: Record<Language, Record<string, string>> = {
  en: { classic: 'Qybeq Classic', neon: 'Neon', porcelain: 'Porcelain', ember: 'Ember', prism: 'Prism' },
  ru: { classic: 'Qybeq Classic', neon: 'Неон', porcelain: 'Фарфор', ember: 'Уголь', prism: 'Призма' },
}

export const copy: Record<Language, AppCopy> = {
  en: {
    back: 'Back', settings: 'Settings', solved: 'Solved', stars: 'Stars', ritual: 'A DAILY LOGIC RITUAL',
    tagline: 'Six dice. Eight pieces. One perfect square.', newPuzzle: 'New puzzle', customize: 'Customize',
    dailyChallenge: 'DAILY CHALLENGE', dailyReady: 'Today’s board is ready', dailyDescription: 'Build your streak and earn up to three stars.',
    playDaily: 'Play daily', howToPlay: 'How to play', privacyPolicy: 'Privacy Policy', webPreview: 'Web preview 0.2',
    appearance: 'APPEARANCE', theme: 'Theme', themeDescription: 'Pieces, blockers and board', audio: 'AUDIO', music: 'Music',
    musicDescription: 'Background playlist', musicVolume: 'Music volume', soundEffects: 'Sound effects',
    soundEffectsDescription: 'Pieces, dice and completion', language: 'Language', languageDescription: 'Interface language',
    english: 'English', russian: 'Русский', fillEveryCell: 'Fill every free cell', elapsedTime: 'Elapsed time',
    rotate: 'Rotate', flip: 'Flip', reset: 'Reset', previewSolution: 'Preview solution', puzzleComplete: 'Puzzle complete',
    puzzleCompleteDescription: 'Every free cell is filled correctly.', continue: 'Continue', livePreview: 'LIVE PREVIEW',
    previewDescription: 'Pieces, blockers and board update together.', themeSets: 'THEME SETS', chooseFinish: 'Choose a finish',
    autosave: 'Changes save automatically', included: 'Included', availableInPreview: 'available in preview',
    placed: (count) => `${count} of 8 placed`, themeName: (id, fallback) => themeNames.en[id] ?? fallback,
  },
  ru: {
    back: 'Назад', settings: 'Настройки', solved: 'Решено', stars: 'Звёзды', ritual: 'ЕЖЕДНЕВНЫЙ РИТУАЛ ЛОГИКИ',
    tagline: 'Шесть кубиков. Восемь фигур. Один идеальный квадрат.', newPuzzle: 'Новая головоломка', customize: 'Оформление',
    dailyChallenge: 'ЗАДАНИЕ ДНЯ', dailyReady: 'Сегодняшняя головоломка готова', dailyDescription: 'Увеличивайте серию и получайте до трёх звёзд.',
    playDaily: 'Играть', howToPlay: 'Как играть', privacyPolicy: 'Конфиденциальность', webPreview: 'Веб-версия 0.2',
    appearance: 'ОФОРМЛЕНИЕ', theme: 'Тема', themeDescription: 'Фигуры, блокеры и поле', audio: 'ЗВУК', music: 'Музыка',
    musicDescription: 'Фоновый плейлист', musicVolume: 'Громкость музыки', soundEffects: 'Звуковые эффекты',
    soundEffectsDescription: 'Фигуры, кубики и завершение', language: 'Язык', languageDescription: 'Язык интерфейса',
    english: 'English', russian: 'Русский', fillEveryCell: 'Заполните все свободные клетки', elapsedTime: 'Время',
    rotate: 'Повернуть', flip: 'Отразить', reset: 'Сбросить', previewSolution: 'Показать решение', puzzleComplete: 'Головоломка решена',
    puzzleCompleteDescription: 'Все свободные клетки заполнены правильно.', continue: 'Продолжить', livePreview: 'ПРЕДПРОСМОТР',
    previewDescription: 'Фигуры, блокеры и поле меняются вместе.', themeSets: 'ТЕМЫ', chooseFinish: 'Выберите оформление',
    autosave: 'Изменения сохраняются автоматически', included: 'Доступно', availableInPreview: 'доступно в предпросмотре',
    placed: (count) => `Размещено: ${count} из 8`, themeName: (id, fallback) => themeNames.ru[id] ?? fallback,
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
