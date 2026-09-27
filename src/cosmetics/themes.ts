import type { CSSProperties } from 'react'

export type PieceMaterial = 'gloss' | 'neon' | 'porcelain' | 'ember' | 'prism'

export interface ThemePreset {
  id: string
  name: string
  price: number
  material: PieceMaterial
  pieceColors: Record<string, string>
  dice: {
    top: string
    bottom: string
    side: string
    label: string
    outline: string
    glow: string
    surface: 'smooth' | 'ceramic' | 'stone' | 'crystal'
  }
  board: {
    top: string
    bottom: string
    edge: string
    well: string
    wellShadow: string
    glow: string
  }
}

const pieceIds = ['line4', 'elbow4', 'tee', 'square', 'zigzag', 'flare', 'elbow3', 'domino'] as const

function colors(values: readonly string[]): Record<string, string> {
  return Object.fromEntries(pieceIds.map((id, index) => [id, values[index]]))
}

export const themes: readonly ThemePreset[] = [
  {
    id: 'classic', name: 'Qybeq Classic', price: 0, material: 'gloss',
    pieceColors: colors(['#2FD4EE', '#FF9447', '#A98BFF', '#FFCF3F', '#3FDC9A', '#5B8CFF', '#FF6FB1', '#B5E84A']),
    dice: { top: '#F7F4EC', bottom: '#DCD7CB', side: '#BFB6A0', label: '#3A3D45', outline: 'rgba(255,255,255,.24)', glow: 'transparent', surface: 'smooth' },
    board: { top: '#30333B', bottom: '#24272D', edge: 'rgba(255,255,255,.08)', well: '#1B1D22', wellShadow: 'rgba(0,0,0,.6)', glow: 'transparent' },
  },
  {
    id: 'neon', name: 'Neon', price: 12, material: 'neon',
    pieceColors: colors(['#1AE5FF', '#FF7A1A', '#B070FF', '#FFE01A', '#1AFF8C', '#3D6DFF', '#FF2E9A', '#B8FF1A']),
    dice: { top: '#1D2331', bottom: '#121620', side: '#080A10', label: '#7DF3FF', outline: 'rgba(34,211,238,.55)', glow: 'rgba(34,211,238,.28)', surface: 'smooth' },
    board: { top: '#15171F', bottom: '#0B0C11', edge: 'rgba(34,211,238,.32)', well: '#050608', wellShadow: 'rgba(0,0,0,.8)', glow: 'rgba(34,211,238,.14)' },
  },
  {
    id: 'porcelain', name: 'Porcelain', price: 24, material: 'porcelain',
    pieceColors: colors(['#83CEDA', '#E9A77B', '#BE9BDD', '#EBD176', '#85CDA8', '#86A6E0', '#E59CB8', '#BDCE80']),
    dice: { top: '#F1F7FC', bottom: '#CBDCE9', side: '#8DA7BD', label: '#263D53', outline: 'rgba(245,250,255,.6)', glow: 'transparent', surface: 'ceramic' },
    board: { top: '#384B5D', bottom: '#263544', edge: '#536B80', well: '#17222D', wellShadow: 'rgba(6,16,26,.65)', glow: 'transparent' },
  },
  {
    id: 'ember', name: 'Ember', price: 39, material: 'ember',
    pieceColors: colors(['#68B4BD', '#D68B59', '#A184B8', '#D8B64D', '#69AD83', '#7295C5', '#CA7E9C', '#A3B665']),
    dice: { top: '#F0D3A1', bottom: '#D5AF77', side: '#94704B', label: '#3F291C', outline: 'rgba(255,220,163,.34)', glow: 'transparent', surface: 'stone' },
    board: { top: '#503A30', bottom: '#30221D', edge: '#8C6545', well: '#201713', wellShadow: 'rgba(9,5,3,.7)', glow: 'transparent' },
  },
  {
    id: 'prism', name: 'Prism', price: 57, material: 'prism',
    pieceColors: colors(['#26C5D9', '#EF8738', '#A573E8', '#F0C32E', '#2ACB83', '#587EE8', '#E95C9D', '#A0CF38']),
    dice: { top: '#44335D', bottom: '#291E3D', side: '#150F24', label: '#F1DEFF', outline: 'rgba(208,164,255,.6)', glow: 'rgba(143,107,182,.18)', surface: 'crystal' },
    board: { top: '#322D50', bottom: '#1B1932', edge: '#756796', well: '#100E1E', wellShadow: 'rgba(5,3,14,.7)', glow: 'rgba(117,103,150,.12)' },
  },
]

export const defaultTheme = themes[0]

export function findTheme(id: string | null): ThemePreset {
  return themes.find((theme) => theme.id === id) ?? defaultTheme
}

export function loadTheme(): ThemePreset {
  try { return findTheme(localStorage.getItem('qybeq.appearance.v1')) } catch { return defaultTheme }
}

export function saveTheme(theme: ThemePreset): void {
  try { localStorage.setItem('qybeq.appearance.v1', theme.id) } catch { /* Optional storage. */ }
}

export function themeStyle(theme: ThemePreset): CSSProperties {
  return {
    '--board-top': theme.board.top,
    '--board-bottom': theme.board.bottom,
    '--board-edge': theme.board.edge,
    '--board-well': theme.board.well,
    '--board-well-shadow': theme.board.wellShadow,
    '--board-glow': theme.board.glow,
    '--dice-top': theme.dice.top,
    '--dice-bottom': theme.dice.bottom,
    '--dice-side': theme.dice.side,
    '--dice-label': theme.dice.label,
    '--dice-outline': theme.dice.outline,
    '--dice-glow': theme.dice.glow,
  } as CSSProperties
}
