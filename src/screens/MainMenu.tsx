import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { QybeqMark } from '../components/QybeqMark'
import { PrimaryAction, SecondaryAction } from '../components/ui'
import { curves } from '../game/curves'
import { timeUntilNextDaily } from '../game/daily'
import type { AppCopy } from '../i18n/translations'
import { bestDailyStreak, currentDailyStreak, todaysDailyStars, type PlayerProgress } from '../progress/playerProgress'
import { prefersReducedMotion } from './game/useTween'
import '../game.css'

/** The intro plays once per page load; returning to the menu is instant. */
let introPlayed = false

/**
 * The app's home (mobile `MainMenuScreen`): the Q mark assembled piece by
 * piece, the wordmark, progress, the Daily Challenge, Play and three
 * shortcuts.
 */
export function MainMenu({ text, progress, resumeDetail, onContinue, onPlay, onDaily, onCustomize, onSettings, onHowToPlay, footer }: {
  text: AppCopy
  progress: PlayerProgress
  /** Progress of the unfinished puzzle, when there is one to continue. */
  resumeDetail?: string | null
  onContinue?: () => void
  onPlay: () => void
  onDaily: () => void
  onCustomize: () => void
  onSettings: () => void
  onHowToPlay: () => void
  footer?: React.ReactNode
}) {
  const reduce = prefersReducedMotion()
  const [intro, setIntro] = useState(introPlayed ? 1 : 0)
  const playsIntro = useRef(!introPlayed)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const node = root.current
    if (!node) return
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playsIntro.current) return
    introPlayed = true
    const duration = reduce ? 260 : 850
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setIntro(t)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduce])

  const phase = (from: number, to: number) => (reduce ? intro : Math.min(1, Math.max(0, (intro - from) / (to - from))))
  const compact = size.height < 720
  const tablet = size.width >= 600
  const cell = Math.min(tablet ? 48 : 36, Math.min(size.width / 9.5, size.height / (compact ? 23 : 20)))
  const width = Math.min(tablet ? 440 : 320, size.width - (tablet ? 96 : 48))
  const titleT = curves.easeOutCubic(phase(0, 0.45))
  const reveal = curves.easeOutCubic(phase(0.55, 1))
  // Centre the drawn shape (the tail pulls it down-right), not the 5×5 box.
  const offset = (2.5 - 2.35) * cell

  return (
    <main ref={root} className="menu-root">
      <div className="app-backdrop menu-backdrop" aria-hidden="true" />
      <div className="menu-column">
        <div className="menu-spacer" style={{ flex: 3 }} />
        <div style={{ transform: `translate(${offset}px, ${offset}px)` }}>
          <QybeqMark cellSize={cell} progress={phase(0.12, 0.9)} reduceMotion={reduce} />
        </div>
        <div style={{ height: cell * (compact ? 0.75 : 1.2), flex: 'none' }} />
        <h1
          className="menu-wordmark"
          aria-label="Qybeq"
          style={{ opacity: titleT, letterSpacing: reduce ? 10 : 10 + 8 * (1 - titleT), fontSize: compact ? 30 : 34 }}
        >
          QYBEQ
        </h1>
        <p className="menu-tagline" style={{ opacity: phase(0.25, 0.65), fontSize: compact ? 14 : 15, marginTop: compact ? 6 : 10 }}>
          {text.tagline}
        </p>
        <div className="menu-spacer" style={{ flex: 2 }} />
        <div
          className="menu-actions-block"
          style={{ width, opacity: reveal, transform: reduce ? undefined : `translateY(${12 * (1 - reveal)}px)`, pointerEvents: reveal < 0.5 ? 'none' : undefined }}
        >
          <div className="progress-summary">
            <button type="button" className="progress-value" onClick={onCustomize} aria-label={text.starsLabel(progress.availableStars)}>
              <Icon name="starRounded" size={20} color="#5B8CFF" />
              <span>{progress.availableStars}</span>
            </button>
            <i />
            <div className="progress-value" aria-label={text.solvedLabel(progress.solvedPuzzleCount)} role="img">
              <Icon name="checkCircleOutlineRounded" size={20} color="#6CF2D2" />
              <span>{progress.solvedPuzzleCount}</span>
            </div>
          </div>
          <div style={{ height: compact ? 10 : 14 }} />
          <DailyCard text={text} progress={progress} compact={compact} onPress={onDaily} />
          <div style={{ height: compact ? 8 : 12 }} />
          {resumeDetail ? (
            <>
              <PrimaryAction label={text.continueGame} detail={resumeDetail} onPress={onContinue} />
              <div style={{ height: 12 }} />
              <SecondaryAction label={text.newPuzzle} onPress={onPlay} />
            </>
          ) : (
            <PrimaryAction label={text.play} onPress={onPlay} />
          )}
          <div style={{ height: 14 }} />
          <div className="shortcut-row">
            <Shortcut icon="helpOutlineRounded" label={text.howToPlayTitle} onPress={onHowToPlay} />
            <Shortcut icon="paletteOutlined" label={text.customize} onPress={onCustomize} />
            <Shortcut icon="tuneRounded" label={text.settings} onPress={onSettings} />
          </div>
        </div>
        <div className="menu-spacer" style={{ flex: 1 }} />
        <div style={{ height: 12, flex: 'none' }} />
        {footer}
      </div>
    </main>
  )
}

function DailyCard({ text, progress, compact, onPress }: { text: AppCopy; progress: PlayerProgress; compact: boolean; onPress: () => void }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = timeUntilNextDaily(now)
  const two = (n: number) => String(n).padStart(2, '0')
  const seconds = Math.floor(remaining / 1000)
  const countdown = `${two(Math.floor(seconds / 3600))}:${two(Math.floor(seconds / 60) % 60)}:${two(seconds % 60)}`
  const stars = todaysDailyStars(progress, now)
  const status = stars > 0 ? text.dailyBest(stars) : text.dailyToday
  const current = currentDailyStreak(progress, now)
  const best = bestDailyStreak(progress)
  return (
    <button
      type="button"
      className={`daily-card${compact ? ' compact' : ''}`}
      onClick={onPress}
      aria-label={text.dailySemantics(status, current, best, countdown)}
    >
      <span className="daily-top">
        <Icon name="todayRounded" size={23} />
        <span className="daily-copy">
          <span className="daily-title">{text.dailyChallenge}</span>
          {!compact && <span className="daily-status">{status}</span>}
        </span>
        <Icon name="chevronRightRounded" size={24} color="#7A808C" />
      </span>
      <span className="daily-metrics">
        <Metric icon="localFireDepartmentRounded" value={String(current)} color="#FF9C54" />
        <Metric icon="emojiEventsRounded" value={String(best)} color="#FFD45C" />
        <Metric icon="scheduleRounded" value={countdown} color="#5B8CFF" wide />
      </span>
    </button>
  )
}

function Metric({ icon, value, color, wide = false }: { icon: IconName; value: string; color: string; wide?: boolean }) {
  return (
    <span className="daily-metric" style={{ flex: wide ? 2 : 1 }}>
      <Icon name={icon} size={16} color={color} />
      <span>{value}</span>
    </span>
  )
}

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <button type="button" className="shortcut" onClick={onPress}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </button>
  )
}
