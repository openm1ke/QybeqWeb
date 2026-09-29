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
  rollToStart: string
  rollingShort: string
  complete: string
  sixDice: string
  tapAnywhereToSkip: string
  rollDice: string
  progress: (placed: number, total: number) => string
  tipRotate: string
  tipPlace: string
  hintPlace: string
  hintRelocate: string
  hintShown: (status: string) => string
  flipSelectedPiece: string
  puzzleCompleteTitle: string
  solvedIn: (time: string) => string
  viewBoard: string
  backToResults: string
  mainMenu: string
  earnedStars: (count: number) => string
  starsAvailable: (count: number) => string
  assistedResult: string
  noAssistance: string
  gameMenu: string
  paused: string
  resume: string
  restartPuzzle: string
  restartTitle: string
  restartBody: string
  newPuzzleTitle: string
  newPuzzleBody: string
  cancel: string
  restart: string
  timerNotStarted: string
  timeLabel: (time: string) => string
  presets: string
  continueGame: string
  continueDetail: (placed: number, total: number, time: string) => string
  next: string
  done: string
  lessons: readonly { title: string; body: string }[]
  pieceTapRotate: (piece: string) => string
  dragOntoOutline: string
  placedGreat: string
  stepOf: (step: number, total: number) => string
  keyboardHelp: string
  keyboardMoveHelp: string
  pieceOnBoard: (piece: string, cell: string) => string
  play: string
  dailyToday: string
  dailyBest: (stars: number) => string
  howToPlayTitle: string
  starsLabel: (count: number) => string
  solvedLabel: (count: number) => string
  dailySemantics: (status: string, current: number, best: number, countdown: string) => string
  unlock: string
  swipeThemes: string
  pieces: string
  dice: string
  board: string
  selected: string
  customMix: string
  resetToClassic: string
  skinKind: (slot: 'pieces' | 'dice' | 'board') => string
  skinSemantics: (name: string, kind: string, selected: boolean, locked: boolean) => string
  presetSemantics: (name: string, selected: boolean) => string
  previewSemantics: (pieces: string, dice: string, board: string) => string
  pieceName: (id: string, fallback: string) => string
  skinName: (id: string, fallback: string) => string
  themeName: (id: string, fallback: string) => string
}

const themeNames: Record<Language, Record<string, string>> = {
  en: { classic: 'Qybeq Classic', neon: 'Neon', porcelain: 'Porcelain', ember: 'Ember', prism: 'Prism' },
  ru: { classic: 'Qybeq Классика', neon: 'Неон', porcelain: 'Фарфор', ember: 'Угли', prism: 'Призма' },
}

const pieceNamesRu: Record<string, string> = {
  line4: 'Линия', elbow4: 'L', tee: 'T', square: 'Квадрат', zigzag: 'S', flare: 'F-пентамино', elbow3: 'Малая L', domino: 'Домино',
}

const skinNamesRu: Record<string, string> = {
  classic: 'Классика', neon: 'Неон', porcelain: 'Фарфор', ember: 'Угли', prism: 'Призма',
  ivory: 'Слоновая кость', midnight: 'Полночь', frost: 'Иней', sandstone: 'Песчаник', amethyst: 'Аметист',
  graphite: 'Графит', void: 'Бездна', slate: 'Сланец', bronze: 'Бронза', indigo: 'Индиго',
}

export const copy: Record<Language, AppCopy> = {
  en: {
    back: 'Back', settings: 'Settings', solved: 'Solved', stars: 'Stars',
    tagline: 'Six dice. Eight pieces. One board.', newPuzzle: 'New puzzle', customize: 'Customize',
    dailyChallenge: 'Daily Challenge', dailyReady: 'Today’s board is ready', dailyDescription: 'Build your streak and earn up to three stars.',
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
    notEnoughStars: 'Not enough stars yet', placed: (count) => `${count} of 8 placed`,
    streakDays: (count) => `${count} day${count === 1 ? '' : 's'}`, starBalance: (count) => `${count} stars available`,
    unlockFor: (price) => `Unlock for ${price} stars`, progressToUnlock: (current, price) => `${current} / ${price} stars`,
    unlockThemeTitle: (name) => `Unlock ${name}?`, unlockThemeBody: (price, balanceAfter) => `This theme costs ${price} stars. Your balance after purchase will be ${balanceAfter} stars.`,
    resultStars: (count) => `You earned ${count} star${count === 1 ? '' : 's'}.`, themeName: (id, fallback) => themeNames.en[id] ?? fallback,
    rollToStart: 'Roll to set the puzzle', rollingShort: 'Rolling…', complete: 'Complete', sixDice: 'Six dice set the blocked cells',
    tapAnywhereToSkip: 'Tap anywhere to skip', rollDice: 'Roll Dice', progress: (placed, total) => `${placed} of ${total} placed`,
    tipRotate: 'Tap a piece to rotate it', tipPlace: 'Drag a piece onto the board', hintPlace: 'Place it on the outline',
    hintRelocate: 'Move it to the outline', hintShown: (status) => `Hint shown. ${status}`, flipSelectedPiece: 'Flip selected piece',
    puzzleCompleteTitle: 'Puzzle Complete', solvedIn: (time) => `Solved in ${time}`, viewBoard: 'View Board', backToResults: 'Show Results',
    mainMenu: 'Main Menu', earnedStars: (count) => `+${count} stars`, starsAvailable: (count) => `${count} available`,
    assistedResult: 'Assistance used', noAssistance: 'No assistance', gameMenu: 'Game menu', paused: 'Paused', resume: 'Resume',
    restartPuzzle: 'Restart Puzzle', restartTitle: 'Restart puzzle?', restartBody: 'All placed pieces will return to their starting positions.',
    newPuzzleTitle: 'New puzzle?', newPuzzleBody: 'Your current puzzle will be replaced.', cancel: 'Cancel', restart: 'Restart',
    timerNotStarted: 'Timer not started', timeLabel: (time) => `Time ${time}`,

    continueGame: 'Continue', continueDetail: (placed, total, time) => `${placed} of ${total} placed · ${time}`, next: 'Next', done: 'Done',
    lessons: [
      { title: 'The board', body: 'Every puzzle starts with six dice — one for each row, A to F. Each die blocks one cell in its row. Blocked cells stay empty.' },
      { title: 'Your pieces', body: 'Eight pieces, thirty squares — exactly enough to cover every cell the dice leave free.' },
      { title: 'Rotate', body: 'Tap a piece in the tray to turn it a quarter turn. Try it here.' },
      { title: 'Flip', body: 'Some pieces can also be mirrored with Flip — it acts on the piece you touched last. It is optional: every puzzle can be solved by rotating alone.' },
      { title: 'Place', body: 'Drag a piece onto the board and it snaps to the grid. The outline shows where it will land; red means it would cover a blocked cell or another piece. Tap a placed piece to take it back.' },
      { title: 'Fill the board', body: 'Place all eight pieces so every free cell is covered — no gaps. Any arrangement that fills the board solves the puzzle.' },
    ],
    pieceTapRotate: (piece) => `${piece} piece. Tap to rotate.`, dragOntoOutline: 'Drag the piece onto the outline', placedGreat: 'Placed!',
    stepOf: (step, total) => `Step ${step} of ${total}`,
    keyboardHelp: 'Enter pick up · R rotate · F flip · H hint · Esc pause',
    keyboardMoveHelp: 'Arrows move · R rotate · F flip · Enter place · Esc cancel',
    pieceOnBoard: (piece, cell) => `${piece} piece at ${cell}. Enter to move, Delete to take it back.`,
    presets: 'Presets', unlock: 'Unlock', play: 'Play', dailyToday: 'Today\'s puzzle', dailyBest: (stars) => `Best today: ${stars} stars`, howToPlayTitle: 'How to Play',
    starsLabel: (count) => `${count} stars`, solvedLabel: (count) => `${count} puzzles solved`,
    dailySemantics: (status, current, best, countdown) => `Daily Challenge, ${status}, current streak ${current}, best streak ${best}, next in ${countdown}`, swipeThemes: 'Swipe to explore', pieces: 'Pieces', dice: 'Dice', board: 'Board', selected: 'Selected',
    customMix: 'Custom mix', resetToClassic: 'Reset to Qybeq Classic',
    skinKind: (slot) => (slot === 'pieces' ? 'piece' : slot === 'dice' ? 'dice' : 'board'),
    skinSemantics: (name, kind, selected, locked) => [`${name} ${kind} style`, selected ? 'selected' : '', locked ? 'locked' : ''].filter(Boolean).join(', '),
    presetSemantics: (name, selected) => `${name} theme${selected ? ', selected' : ''}`,
    previewSemantics: (pieces, dice, board) => `Preview: ${pieces} pieces, ${dice} dice, ${board} board`,
    pieceName: (_id, fallback) => fallback,
    skinName: (_id, fallback) => fallback,
  },
  ru: {
    back: 'Назад', settings: 'Настройки', solved: 'Решено', stars: 'Звёзды',
    tagline: 'Шесть кубиков. Восемь фигур. Одно поле.', newPuzzle: 'Новая головоломка', customize: 'Оформление',
    dailyChallenge: 'Задание дня', dailyReady: 'Сегодняшняя головоломка готова', dailyDescription: 'Увеличивайте серию и получайте до трёх звёзд.',
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
    notEnoughStars: 'Пока недостаточно звёзд', placed: (count) => `Размещено: ${count} из 8`,
    streakDays: (count) => `${count} дн.`, starBalance: (count) => `Доступно звёзд: ${count}`,
    unlockFor: (price) => `Открыть за ${price} зв.`, progressToUnlock: (current, price) => `${current} / ${price} зв.`,
    unlockThemeTitle: (name) => `Открыть тему «${name}»?`, unlockThemeBody: (price, balanceAfter) => `Тема стоит ${price} звёзд. После покупки останется ${balanceAfter} звёзд.`,
    resultStars: (count) => `Получено звёзд: ${count}.`, themeName: (id, fallback) => themeNames.ru[id] ?? fallback,
    rollToStart: 'Бросьте кубики', rollingShort: 'Бросаем…', complete: 'Готово', sixDice: 'Шесть кубиков задают закрытые клетки',
    tapAnywhereToSkip: 'Коснитесь экрана, чтобы пропустить', rollDice: 'Бросить кубики', progress: (placed, total) => `Размещено ${placed} из ${total}`,
    tipRotate: 'Коснитесь фигуры, чтобы повернуть её', tipPlace: 'Перетащите фигуру на поле', hintPlace: 'Поставьте фигуру на контур',
    hintRelocate: 'Переместите фигуру на контур', hintShown: (status) => `Подсказка показана. ${status}`, flipSelectedPiece: 'Отразить выбранную фигуру',
    puzzleCompleteTitle: 'Головоломка решена', solvedIn: (time) => `Время решения: ${time}`, viewBoard: 'Посмотреть поле', backToResults: 'Показать результат',
    mainMenu: 'Главное меню', earnedStars: (count) => `+${count} зв.`, starsAvailable: (count) => `Доступно: ${count}`,
    assistedResult: 'Использована помощь', noAssistance: 'Без подсказок', gameMenu: 'Меню игры', paused: 'Пауза', resume: 'Продолжить',
    restartPuzzle: 'Начать заново', restartTitle: 'Начать заново?', restartBody: 'Все фигуры вернутся на исходные позиции.',
    newPuzzleTitle: 'Новая головоломка?', newPuzzleBody: 'Текущая головоломка будет заменена.', cancel: 'Отмена', restart: 'Начать заново',
    timerNotStarted: 'Таймер не запущен', timeLabel: (time) => `Время ${time}`,

    continueGame: 'Продолжить', continueDetail: (placed, total, time) => `Размещено ${placed} из ${total} · ${time}`, next: 'Далее', done: 'Готово',
    lessons: [
      { title: 'Игровое поле', body: 'Каждая головоломка начинается с шести кубиков — по одному для каждого ряда от A до F. Каждый кубик закрывает одну клетку в своём ряду. Закрытые клетки остаются пустыми.' },
      { title: 'Ваши фигуры', body: 'Восемь фигур и тридцать квадратов — ровно столько, чтобы закрыть все свободные клетки.' },
      { title: 'Поворот', body: 'Коснитесь фигуры внизу, чтобы повернуть её на четверть оборота. Попробуйте здесь.' },
      { title: 'Отражение', body: 'Некоторые фигуры можно отразить кнопкой «Отразить» — она действует на последнюю выбранную фигуру. Это необязательно: любую головоломку можно решить одними поворотами.' },
      { title: 'Размещение', body: 'Перетащите фигуру на поле, и она встанет по сетке. Контур показывает место установки; красный цвет означает, что фигура перекрывает закрытую клетку или другую фигуру. Коснитесь установленной фигуры, чтобы вернуть её.' },
      { title: 'Заполните поле', body: 'Разместите все восемь фигур так, чтобы закрыть каждую свободную клетку без пробелов. Подходит любое расположение, полностью заполняющее поле.' },
    ],
    pieceTapRotate: (piece) => `Фигура ${piece}. Коснитесь, чтобы повернуть.`, dragOntoOutline: 'Перетащите фигуру на контур', placedGreat: 'Готово!',
    stepOf: (step, total) => `Шаг ${step} из ${total}`,
    keyboardHelp: 'Enter — взять · R — поворот · F — отражение · H — подсказка · Esc — пауза',
    keyboardMoveHelp: 'Стрелки — сдвиг · R — поворот · F — отражение · Enter — поставить · Esc — отмена',
    pieceOnBoard: (piece, cell) => `Фигура ${piece} на ${cell}. Enter — переместить, Delete — вернуть.`,
    presets: 'Темы', unlock: 'Открыть', play: 'Играть', dailyToday: 'Сегодняшняя головоломка', dailyBest: (stars) => `Лучший результат: ${stars} зв.`, howToPlayTitle: 'Как играть',
    starsLabel: (count) => `Звёзд: ${count}`, solvedLabel: (count) => `Решено головоломок: ${count}`,
    dailySemantics: (status, current, best, countdown) => `Задание дня, ${status}, текущая серия ${current}, лучшая серия ${best}, следующее через ${countdown}`, swipeThemes: 'Листайте для просмотра', pieces: 'Фигуры', dice: 'Кубики', board: 'Поле', selected: 'Выбрано',
    customMix: 'Смешанное оформление', resetToClassic: 'Вернуть Qybeq Classic',
    skinKind: (slot) => (slot === 'pieces' ? 'фигур' : slot === 'dice' ? 'кубиков' : 'поля'),
    skinSemantics: (name, kind, selected, locked) => [`${name}: стиль ${kind}`, selected ? 'выбрано' : '', locked ? 'закрыто' : ''].filter(Boolean).join(', '),
    presetSemantics: (name, selected) => `Тема ${name}${selected ? ', выбрано' : ''}`,
    previewSemantics: (pieces, dice, board) => `Предпросмотр: фигуры ${pieces}, кубики ${dice}, поле ${board}`,
    pieceName: (id, fallback) => pieceNamesRu[id] ?? fallback,
    skinName: (id, fallback) => skinNamesRu[id] ?? fallback,
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
