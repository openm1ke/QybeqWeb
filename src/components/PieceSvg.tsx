import { useId, type CSSProperties } from 'react'
import { shapeBounds } from '../game/transforms'
import type { Cell } from '../game/types'
import type { PieceMaterial } from '../cosmetics/themes'

interface PieceSvgProps {
  cells: readonly Cell[]
  color: string
  className?: string
  label?: string
  material?: PieceMaterial
}

export function PieceSvg({ cells, color, className, label, material = 'gloss' }: PieceSvgProps) {
  const bounds = shapeBounds(cells)
  const occupied = new Set(cells.map((cell) => `${cell.row}:${cell.col}`))
  const junctions = cells.filter((cell) =>
    occupied.has(`${cell.row}:${cell.col + 1}`) &&
    occupied.has(`${cell.row + 1}:${cell.col}`) &&
    occupied.has(`${cell.row + 1}:${cell.col + 1}`),
  )
  const rawId = useId().replaceAll(':', '')
  const gradientId = `piece-gradient-${rawId}`
  const glowId = `piece-glow-${rawId}`
  const gradient = material === 'neon'
    ? ['color-mix(in srgb, black 62%, var(--piece-color))', 'color-mix(in srgb, black 76%, var(--piece-color))', 'color-mix(in srgb, black 84%, var(--piece-color))']
    : material === 'porcelain'
      ? ['color-mix(in srgb, white 44%, var(--piece-color))', 'color-mix(in srgb, white 12%, var(--piece-color))', 'color-mix(in srgb, #675f70 16%, var(--piece-color))']
      : material === 'ember'
        ? ['color-mix(in srgb, white 20%, var(--piece-color))', 'var(--piece-color)', 'color-mix(in srgb, #3b241a 24%, var(--piece-color))']
        : material === 'prism'
          ? ['color-mix(in srgb, white 32%, var(--piece-color))', 'var(--piece-color)', 'color-mix(in srgb, black 28%, var(--piece-color))']
          : ['color-mix(in srgb, white 42%, var(--piece-color))', 'var(--piece-color)', 'color-mix(in srgb, black 24%, var(--piece-color))']

  return (
    <svg
      className={[className, 'piece-svg', `material-${material}`].filter(Boolean).join(' ')}
      viewBox={`0 0 ${bounds.cols * 100} ${bounds.rows * 100}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      style={{ '--piece-color': color } as CSSProperties}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={gradient[0]} />
          <stop offset="0.48" stopColor={gradient[1]} />
          <stop offset="1" stopColor={gradient[2]} />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter={material === 'neon' ? `url(#${glowId})` : undefined}>
        {/* Join adjacent cells underneath their rounded faces. The mobile
            pieces read as one moulded object; leaving the full board gutter
            between every SVG rect made the web piece look like loose dice. */}
        {cells.map((cell) => {
          const x = cell.col * 100
          const y = cell.row * 100
          const joinsRight = occupied.has(`${cell.row}:${cell.col + 1}`)
          const joinsDown = occupied.has(`${cell.row + 1}:${cell.col}`)
          return (
            <g key={`joins-${cell.row}:${cell.col}`}>
              {joinsRight && <rect x={x + 84} y={y + 7} width="32" height="91" rx="7" fill="rgba(0,0,0,.24)" />}
              {joinsDown && <rect x={x + 4} y={y + 84} width="92" height="32" rx="7" fill="rgba(0,0,0,.24)" />}
              {joinsRight && <rect x={x + 86} y={y + 3} width="28" height="93" fill={`url(#${gradientId})`} />}
              {joinsDown && <rect x={x + 2} y={y + 86} width="96" height="28" fill={`url(#${gradientId})`} />}
            </g>
          )
        })}
        {junctions.map((cell) => (
          <g key={`junction-${cell.row}:${cell.col}`}>
            <rect x={cell.col * 100 + 89} y={cell.row * 100 + 91} width="22" height="23" rx="5" fill="rgba(0,0,0,.24)" />
            <rect x={cell.col * 100 + 90} y={cell.row * 100 + 90} width="20" height="20" fill={`url(#${gradientId})`} />
          </g>
        ))}
        {cells.map((cell) => {
          const x = cell.col * 100
          const y = cell.row * 100
          return (
            <g key={`${cell.row}:${cell.col}`}>
              <rect x={x + 1.5} y={y + 6} width="97" height="93" rx="16" fill="rgba(0,0,0,.28)" />
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width="97"
                height="95"
                rx="16"
                fill={`url(#${gradientId})`}
                stroke={material === 'neon' ? 'var(--piece-color)' : material === 'porcelain' ? 'rgba(255,247,230,.78)' : 'rgba(255,255,255,.28)'}
                strokeWidth={material === 'neon' ? '4' : '3'}
              />
              {material === 'porcelain' && <rect x={x + 7} y={y + 7} width="86" height="84" rx="12" fill="none" stroke="rgba(255,255,255,.48)" strokeWidth="2" />}
              {material === 'ember' && Array.from({ length: 7 }, (_, line) => <path key={line} d={`M ${x + 10} ${y + 22 + line * 9} H ${x + 90}`} stroke={line % 2 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.11)'} strokeWidth="1.4" />)}
              {material === 'prism' && <g opacity=".72">
                <path d={`M ${x + 50} ${y + 49} L ${x + 2} ${y + 2} L ${x + 98} ${y + 2} Z`} fill="rgba(255,255,255,.24)" />
                <path d={`M ${x + 50} ${y + 49} L ${x + 98} ${y + 2} L ${x + 98} ${y + 96} Z`} fill="rgba(0,0,0,.10)" />
                <path d={`M ${x + 50} ${y + 49} L ${x + 98} ${y + 96} L ${x + 2} ${y + 96} Z`} fill="rgba(0,0,0,.18)" />
                <path d={`M ${x + 50} ${y + 49} L ${x + 2} ${y + 96} L ${x + 2} ${y + 2} Z`} fill="rgba(255,255,255,.07)" />
              </g>}
              <path
                d={`M ${x + 15} ${y + 14} H ${x + 85} Q ${x + 93} ${y + 14} ${x + 93} ${y + 22}`}
                fill="none"
                stroke={material === 'neon' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.52)'}
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          )
        })}
        {/* Cover only the pin-sized intersection where four rounded faces
            meet. Internal seams remain visible, but a 2×2 block cannot show
            the background through its centre. */}
        {junctions.map((cell) => (
          <rect
            key={`junction-cap-${cell.row}:${cell.col}`}
            x={cell.col * 100 + 96}
            y={cell.row * 100 + 95}
            width="8"
            height="9"
            rx="2"
            fill={`url(#${gradientId})`}
          />
        ))}
      </g>
    </svg>
  )
}
