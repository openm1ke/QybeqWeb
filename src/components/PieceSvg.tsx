import { useId, type CSSProperties } from 'react'
import { shapeBounds } from '../game/transforms'
import type { Cell } from '../game/types'

interface PieceSvgProps {
  cells: readonly Cell[]
  color: string
  className?: string
  label?: string
}

export function PieceSvg({ cells, color, className, label }: PieceSvgProps) {
  const bounds = shapeBounds(cells)
  const rawId = useId().replaceAll(':', '')
  const gradientId = `piece-gradient-${rawId}`

  return (
    <svg
      className={className}
      viewBox={`0 0 ${bounds.cols * 100} ${bounds.rows * 100}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      style={{ '--piece-color': color } as CSSProperties}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, white 42%, var(--piece-color))" />
          <stop offset="0.48" stopColor="var(--piece-color)" />
          <stop offset="1" stopColor="color-mix(in srgb, black 24%, var(--piece-color))" />
        </linearGradient>
      </defs>
      <g>
        {cells.map((cell) => {
          const x = cell.col * 100
          const y = cell.row * 100
          return (
            <g key={`${cell.row}:${cell.col}`}>
              <rect x={x + 3} y={y + 8} width="94" height="89" rx="18" fill="rgba(0,0,0,.28)" />
              <rect
                x={x + 3}
                y={y + 3}
                width="94"
                height="90"
                rx="18"
                fill={`url(#${gradientId})`}
                stroke="rgba(255,255,255,.28)"
                strokeWidth="3"
              />
              <path
                d={`M ${x + 17} ${y + 16} H ${x + 83} Q ${x + 91} ${y + 16} ${x + 91} ${y + 24}`}
                fill="none"
                stroke="rgba(255,255,255,.52)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
