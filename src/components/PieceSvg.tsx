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
  const occupied = new Set(cells.map((cell) => `${cell.row}:${cell.col}`))
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
                stroke="rgba(255,255,255,.28)"
                strokeWidth="3"
              />
              <path
                d={`M ${x + 15} ${y + 14} H ${x + 85} Q ${x + 93} ${y + 14} ${x + 93} ${y + 22}`}
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
