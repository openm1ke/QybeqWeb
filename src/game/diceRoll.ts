import { curves, lerp } from './curves'
import { otherFaces, rollCell, type DiceRoll, type DieResult } from './dice'
import { shuffle, type RandomSource } from './random'
import type { Cell } from './types'

/**
 * The opening ritual of the mobile app (`dice_roll_spec.dart`,
 * `dice_roll_math.dart`): a fully determined choreography for a roll the
 * game already decided. Positions are in board cell units (x = column,
 * y = row; the centre of B3 is (2.5, 1.5)), heights in die sizes, angles in
 * radians, times in seconds.
 */

export interface Vec {
  readonly x: number
  readonly y: number
}

export interface DiceTimeline {
  readonly prepare: number
  readonly maxLaunchDelay: number
  readonly flight: number
  readonly bounce1: number
  readonly bounce2: number
  readonly settle: number
  readonly pause: number
  readonly snap: number
  readonly snapStagger: number
}

/** ≈1.5 s: throw, tumble, two bounces, a beat, snap into cells. */
export const standardTimeline: DiceTimeline = {
  prepare: 0.1, maxLaunchDelay: 0.14, flight: 0.46, bounce1: 0.15, bounce2: 0.09, settle: 0.06, pause: 0.16, snap: 0.26, snapStagger: 0.02,
}

/** ≈0.8 s: a short drop in place, one small bounce, snap. No tumbling. */
export const reducedTimeline: DiceTimeline = {
  prepare: 0.03, maxLaunchDelay: 0.04, flight: 0.22, bounce1: 0.1, bounce2: 0, settle: 0.04, pause: 0.1, snap: 0.22, snapStagger: 0,
}

export interface DieSpec {
  readonly result: DieResult
  readonly snapOrder: number
  readonly launch: Vec
  readonly landing: Vec
  readonly rest: Vec
  readonly launchDelay: number
  readonly launchHeight: number
  readonly peakHeight: number
  readonly bounce1Height: number
  readonly bounce2Height: number
  readonly spinX: number
  readonly spinY: number
  readonly spinZ: number
  readonly restTilt: number
}

export interface DiceRollPlan {
  readonly dice: readonly DieSpec[]
  readonly timeline: DiceTimeline
  readonly reduceMotion: boolean
}

export function dieTarget(die: DieSpec): Cell {
  return rollCell(die.result)
}

export function dieTargetCenter(die: DieSpec): Vec {
  const cell = dieTarget(die)
  return { x: cell.col + 0.5, y: cell.row + 0.5 }
}

/** Labels of the six faces: the rolled cell first, then the rest. */
export function dieFaceCells(die: DieSpec): Cell[] {
  return [rollCell(die.result), ...otherFaces(die.result)]
}

export function generateRollPlan(options: {
  roll: DiceRoll
  random: RandomSource
  reduceMotion?: boolean
  launchFrom?: Vec
  boardSize?: number
}): DiceRollPlan {
  const { roll, random, reduceMotion = false, launchFrom = { x: 3, y: 8.5 }, boardSize = 6 } = options
  const timeline = reduceMotion ? reducedTimeline : standardTimeline
  const count = roll.length
  const launchOrder = shuffle(Array.from({ length: count }, (_, i) => i), random)
  const landings = spreadLandings(count, boardSize, random)

  const between = (a: number, b: number) => a + (b - a) * random.nextDouble()
  const signed = (a: number, b: number) => between(a, b) * (random.nextBool() ? 1 : -1)

  const dice: DieSpec[] = []
  for (let i = 0; i < count; i += 1) {
    const landing = landings[i]
    const launch = reduceMotion ? landing : { x: launchFrom.x + between(-1.6, 1.6), y: launchFrom.y + between(-0.4, 0.4) }
    const travel = { x: landing.x - launch.x, y: landing.y - launch.y }
    const distance = Math.hypot(travel.x, travel.y)
    let slide: Vec = { x: 0, y: 0 }
    if (!reduceMotion && distance !== 0) {
      const length = between(0.22, 0.42)
      slide = { x: (travel.x / distance) * length, y: (travel.y / distance) * length }
    }
    const order = launchOrder.indexOf(i)
    dice.push({
      result: roll[i],
      snapOrder: i,
      launch,
      landing,
      rest: clampToBoard({ x: landing.x + slide.x, y: landing.y + slide.y }, boardSize, 0.6),
      launchDelay: count <= 1 ? 0 : (timeline.maxLaunchDelay * order) / (count - 1),
      launchHeight: reduceMotion ? 0.7 : between(0.5, 0.8),
      peakHeight: reduceMotion ? 0 : between(1.3, 1.9),
      bounce1Height: reduceMotion ? 0.08 : between(0.28, 0.4),
      bounce2Height: reduceMotion ? 0 : between(0.08, 0.13),
      spinX: reduceMotion ? 0 : signed(2 * Math.PI, 4 * Math.PI),
      spinY: reduceMotion ? 0 : signed(1 * Math.PI, 2.5 * Math.PI),
      spinZ: reduceMotion ? 0 : signed(0.3 * Math.PI, 0.9 * Math.PI),
      restTilt: reduceMotion ? signed(0.02, 0.06) : signed(0.1, 0.24),
    })
  }
  return { dice, timeline, reduceMotion }
}

export const launchAt = (plan: DiceRollPlan, die: DieSpec) => plan.timeline.prepare + die.launchDelay
export const landAt = (plan: DiceRollPlan, die: DieSpec) => launchAt(plan, die) + plan.timeline.flight
export const settledAt = (plan: DiceRollPlan, die: DieSpec) =>
  landAt(plan, die) + plan.timeline.bounce1 + plan.timeline.bounce2 + plan.timeline.settle
export const allLanded = (plan: DiceRollPlan) => Math.max(0, ...plan.dice.map((die) => landAt(plan, die)))
export const snapStart = (plan: DiceRollPlan) => Math.max(0, ...plan.dice.map((die) => settledAt(plan, die))) + plan.timeline.pause
export const snapStartOf = (plan: DiceRollPlan, die: DieSpec) => snapStart(plan) + die.snapOrder * plan.timeline.snapStagger
export const snapEndOf = (plan: DiceRollPlan, die: DieSpec) => snapStartOf(plan, die) + plan.timeline.snap

/** Length of the whole ritual in seconds. */
export const rollTotal = (plan: DiceRollPlan) => Math.max(0, ...plan.dice.map((die) => snapEndOf(plan, die)))

export type RollPhase = 'rollingDice' | 'settlingDice' | 'snappingToBoard' | 'readyToPlay'

export function phaseAt(plan: DiceRollPlan, t: number): RollPhase {
  if (t < allLanded(plan)) return 'rollingDice'
  if (t < snapStart(plan)) return 'settlingDice'
  if (t < rollTotal(plan)) return 'snappingToBoard'
  return 'readyToPlay'
}

/** Resting footprint of a die relative to a blocked tile. */
export const dieRestSize = 0.84
/** How much bigger a die looks per die-size of height. */
export const dieHeightScale = 0.3
/** Camera tilt while dice are loose on the table; goes to 0 on snap. */
export const dieRestViewTilt = -0.32

export interface DieFrame {
  readonly center: Vec
  readonly height: number
  readonly rotX: number
  readonly rotY: number
  readonly rotZ: number
  readonly size: number
  readonly viewTilt: number
  /** 0 = tumbling die, 1 = indistinguishable from a blocked tile. */
  readonly tileBlend: number
  readonly opacity: number
  /** Landing ring progress (0 = none). */
  readonly impact: number
  readonly inFlight: boolean
}

/** Pose of [die] at time [t] (seconds since the Roll press). */
export function dieFrameAt(plan: DiceRollPlan, die: DieSpec, t: number): DieFrame {
  const tl = plan.timeline
  const launch = launchAt(plan, die)
  const land = landAt(plan, die)
  const settled = settledAt(plan, die)
  const snapFrom = snapStartOf(plan, die)
  const snapTo = snapEndOf(plan, die)
  const target = dieTargetCenter(die)

  const spinProgress = Math.min(1, Math.max(0, (t - launch) / (settled - launch)))
  const remain = (1 - spinProgress) ** 3
  const impactWindow = plan.reduceMotion ? 0 : 0.24

  if (t >= snapTo) {
    return { center: target, height: 0, rotX: 0, rotY: 0, rotZ: 0, size: 1, viewTilt: 0, tileBlend: 1, opacity: 1, impact: 0, inFlight: false }
  }

  if (t >= snapFrom) {
    const raw = (t - snapFrom) / tl.snap
    const w = curves.easeInOutCubic(raw)
    return {
      center: lerpVec(die.rest, target, w),
      height: (plan.reduceMotion ? 0.08 : 0.22) * Math.sin(Math.PI * raw),
      rotX: 0,
      rotY: 0,
      rotZ: die.restTilt * (1 - w),
      size: lerp(dieRestSize, 1, w),
      viewTilt: dieRestViewTilt * (1 - w),
      tileBlend: Math.min(1, Math.max(0, (raw - 0.7) / 0.3)),
      opacity: 1,
      impact: 0,
      inFlight: false,
    }
  }

  let height: number
  let center: Vec
  let opacity = 1
  let impact = 0
  if (t < land) {
    const u = Math.min(1, Math.max(0, (t - launch) / tl.flight))
    center = lerpVec(die.launch, die.landing, 1 - (1 - u) ** 1.6)
    height = plan.reduceMotion
      ? die.launchHeight * (1 - u) ** 2
      : die.launchHeight * (1 - u) + 4 * die.peakHeight * u * (1 - u)
    const fadeIn = plan.reduceMotion ? 0.35 : 0.12
    opacity = t < launch ? 0 : Math.min(1, Math.max(0, u / fadeIn))
  } else {
    const since = t - land
    if (since < tl.bounce1) height = die.bounce1Height * Math.sin((Math.PI * since) / tl.bounce1)
    else if (since < tl.bounce1 + tl.bounce2) height = die.bounce2Height * Math.sin((Math.PI * (since - tl.bounce1)) / tl.bounce2)
    else height = 0
    const slide = Math.min(1, Math.max(0, (t - land) / (settled - land)))
    center = lerpVec(die.landing, die.rest, curves.easeOutCubic(slide))
    if (impactWindow > 0 && since < impactWindow) impact = since / impactWindow
  }

  return {
    center,
    height,
    rotX: die.spinX * remain,
    rotY: die.spinY * remain,
    rotZ: die.restTilt + die.spinZ * remain,
    size: dieRestSize,
    viewTilt: dieRestViewTilt,
    tileBlend: 0,
    opacity,
    impact,
    inFlight: t < land,
  }
}

/** Landing spots spread over the board so dice don't pile up. */
function spreadLandings(count: number, size: number, random: RandomSource): Vec[] {
  const margin = 0.8
  const minDistance = 1.35
  const spots: Vec[] = []
  for (let i = 0; i < count; i += 1) {
    let best: Vec | null = null
    let bestGap = -1
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = { x: margin + random.nextDouble() * (size - 2 * margin), y: margin + random.nextDouble() * (size - 2 * margin) }
      const gap = spots.length === 0 ? Infinity : Math.min(...spots.map((s) => Math.hypot(s.x - candidate.x, s.y - candidate.y)))
      if (gap > bestGap) {
        best = candidate
        bestGap = gap
      }
      if (gap >= minDistance) break
    }
    spots.push(best!)
  }
  return spots
}

function clampToBoard(p: Vec, size: number, margin: number): Vec {
  return { x: Math.min(size - margin, Math.max(margin, p.x)), y: Math.min(size - margin, Math.max(margin, p.y)) }
}

function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
