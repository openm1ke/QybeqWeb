import { describe, expect, it } from 'vitest'
import { appearanceStorageKey, classicAppearance, isItemUnlocked, loadAppearance } from '../cosmetics/appearance'
import { boardSkins, diceSkins, materials, pieceSkins, presetFor, presets } from '../cosmetics/skins'
import { candidateOrigin } from '../game/boardGeometry'
import { cellLabel, parseCell } from '../game/cells'
import { dailySeed, StableRandom } from '../game/daily'
import { levelForRoll, rollNewPuzzle, rollShowing } from '../game/dice'
import { dieFrameAt, dieTargetCenter, generateRollPlan, phaseAt, rollTotal } from '../game/diceRoll'
import { pieces, sampleLevel } from '../game/pieces'
import { shapeBounds, transformCells } from '../game/transforms'
import { computeTrayLayout } from '../game/trayLayout'
import { argb, shade, withLightness } from '../rendering/color'
import { DartRandom } from '../rendering/dartRandom'
import { cellGap, pieceOutline } from '../rendering/pieceGeometry'

const hex = (color: { a: number; r: number; g: number; b: number }) =>
  [color.a, color.r, color.g, color.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')

describe('Dart parity', () => {
  it('reproduces dart:math Random bit for bit', () => {
    const random = new DartRandom(7319)
    const doubles = Array.from({ length: 6 }, () => random.nextDouble())
    expect(doubles).toEqual([0.6293012824189221, 0.6237855007913925, 0.2773818463910358, 0.6564946659718573, 0.5482908183490044, 0.14910913148575333])
    const other = new DartRandom(42)
    expect([other.nextInt(100), other.nextInt(7), other.nextBool()]).toEqual([87, 1, true])
  })

  it('derives shades like Flutter HSLColor with 8-bit rounding', () => {
    // The ivory tile side was defined in Flutter as faceBottom.shade(-0.14).
    expect(hex(shade(argb(0xffdcd7cb), -0.14))).toBe('ffbfb6a0')
    // Neon cores, as computed by Flutter's HSLColor.withLightness(0.2).
    expect(hex(withLightness(argb(0xff1ae5ff), materials.neon.core))).toBe('ff005a66')
    expect(hex(withLightness(argb(0xffffe01a), materials.neon.core))).toBe('ff665800')
    expect(hex(withLightness(argb(0xffb070ff), materials.neon.core))).toBe('ff2e0066')
  })

  it('generates the same Daily Challenge as the mobile app', () => {
    const vectors: Record<string, string> = {
      '2026-01-01': 'A2,B6,C4,D2,E4,F4',
      '2026-09-29': 'A1,B2,C5,D4,E2,F6',
      '2027-03-15': 'A2,B4,C1,D2,E2,F4',
      '2026-12-31': 'A6,B1,C4,D2,E3,F1',
    }
    for (const [day, cells] of Object.entries(vectors)) {
      const [y, m, d] = day.split('-').map(Number)
      const { level } = rollNewPuzzle(new StableRandom(dailySeed(new Date(y, m - 1, d))), pieces)
      expect(level.blockedCells.map(cellLabel).join(','), day).toBe(cells)
    }
  })

  it('choreographs the dice roll exactly like the mobile plan', () => {
    const plan = generateRollPlan({ roll: rollShowing(sampleLevel.blockedCells), random: new StableRandom(123), launchFrom: { x: 3, y: 8.5 } })
    const die = plan.dice[2]
    const frame = dieFrameAt(plan, die, 0.4)
    const f = (v: number) => v.toFixed(6)
    expect(f(rollTotal(plan))).toBe('1.520000')
    expect([die.launch.x, die.launch.y].map(f)).toEqual(['1.784106', '8.462597'])
    expect([die.landing.x, die.landing.y].map(f)).toEqual(['1.392582', '4.625248'])
    expect([die.rest.x, die.rest.y].map(f)).toEqual(['1.352731', '4.234668'])
    expect([die.spinX, die.spinY, die.spinZ].map(f)).toEqual(['12.257015', '-4.315971', '2.237652'])
    expect(f(die.restTilt)).toBe('0.185297')
    expect(f(die.launchDelay)).toBe('0.084000')
    expect([frame.center.x, frame.center.y, frame.height, frame.rotX].map(f)).toEqual(['1.534543', '6.016617', '1.971016', '4.495113'])
  })
})

describe('dice roll', () => {
  const roll = rollShowing(sampleLevel.blockedCells)

  it('lasts about 1.5 s, about 0.8 s with reduced motion', () => {
    expect(rollTotal(generateRollPlan({ roll, random: new StableRandom(1) }))).toBeGreaterThanOrEqual(1.2)
    expect(rollTotal(generateRollPlan({ roll, random: new StableRandom(1) }))).toBeLessThanOrEqual(1.8)
    const reduced = rollTotal(generateRollPlan({ roll, random: new StableRandom(1), reduceMotion: true }))
    expect(reduced).toBeGreaterThanOrEqual(0.7)
    expect(reduced).toBeLessThanOrEqual(0.9)
  })

  it('ends every die flat in its rolled cell, phases in order', () => {
    const plan = generateRollPlan({ roll, random: new StableRandom(7) })
    const order = ['rollingDice', 'settlingDice', 'snappingToBoard', 'readyToPlay']
    let previous = 0
    for (let t = 0; t <= rollTotal(plan) + 0.05; t += 0.01) {
      const index = order.indexOf(phaseAt(plan, t))
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
    for (const die of plan.dice) {
      const end = dieFrameAt(plan, die, rollTotal(plan))
      expect(end.center).toEqual(dieTargetCenter(die))
      expect([end.tileBlend, end.size, end.height, end.rotX, end.rotY, end.rotZ]).toEqual([1, 1, 0, 0, 0, 0])
    }
  })

  it('only ever hands out puzzles solvable by rotation alone', () => {
    const random = new StableRandom(99)
    for (let i = 0; i < 20; i += 1) {
      const { roll: next, level } = rollNewPuzzle(random, pieces)
      expect(next.map((r) => r.row)).toEqual([0, 1, 2, 3, 4, 5])
      expect(levelForRoll(next, pieces)).not.toBeNull()
      expect(level.referenceSolution).toHaveLength(8)
    }
  })
})

describe('piece body', () => {
  it('is one continuous outline per piece, inset by half a gap', () => {
    const c = 40
    const g = cellGap(c) / 2
    for (const piece of pieces) {
      const loops = pieceOutline(piece.cells, c)
      expect(loops, piece.id).toHaveLength(1)
      const xs = loops[0].map((p) => p.x)
      const ys = loops[0].map((p) => p.y)
      const bounds = shapeBounds(piece.cells)
      expect(Math.min(...xs)).toBeCloseTo(g)
      expect(Math.max(...xs)).toBeCloseTo(bounds.cols * c - g)
      expect(Math.min(...ys)).toBeCloseTo(g)
      expect(Math.max(...ys)).toBeCloseTo(bounds.rows * c - g)
    }
  })

  it('has no inner seams: a 2×2 square is a single rectangle, an L has six corners', () => {
    expect(pieceOutline(pieces.find((p) => p.id === 'square')!.cells, 40)[0]).toHaveLength(4)
    expect(pieceOutline(pieces.find((p) => p.id === 'elbow4')!.cells, 40)[0]).toHaveLength(6)
    expect(pieceOutline(pieces.find((p) => p.id === 'flare')!.cells, 40)[0]).toHaveLength(10)
  })
})

describe('board and tray geometry', () => {
  it('snaps a floating piece to the nearest cell and keeps it on the board', () => {
    const c = 50
    expect(candidateOrigin(c * 2.4, c * 1.6, 2, 2, c, 6)).toEqual({ row: 2, col: 2 })
    expect(candidateOrigin(c * 4.7, c * -0.2, 2, 2, c, 6)).toEqual({ row: 0, col: 4 })
    expect(candidateOrigin(c * 7, c * 2, 1, 2, c, 6)).toBeNull()
  })

  it('packs every piece in a fixed square slot that fits any rotation', () => {
    const spans = pieces.map((p) => { const b = shapeBounds(p.cells); return Math.max(b.rows, b.cols) })
    const layout = computeTrayLayout({ spans, width: 358, height: 300, maxCellSize: 40 })
    expect(layout.cellSize).toBeGreaterThan(0)
    expect(layout.cellSize).toBeLessThanOrEqual(40)
    layout.slots.forEach((slot, i) => {
      expect(slot.size).toBeCloseTo(spans[i] * layout.cellSize)
      expect(slot.left).toBeGreaterThanOrEqual(-0.01)
      expect(slot.top + slot.size).toBeLessThanOrEqual(300.01)
      for (const turns of [0, 1, 2, 3]) {
        const b = shapeBounds(transformCells(pieces[i].cells, { quarterTurns: turns, mirrored: false }))
        expect(Math.max(b.rows, b.cols) * layout.cellSize).toBeLessThanOrEqual(slot.size + 0.01)
      }
      layout.slots.slice(i + 1).forEach((other) => {
        const apart = slot.left + slot.size <= other.left + 0.01 || other.left + other.size <= slot.left + 0.01 ||
          slot.top + slot.size <= other.top + 0.01 || other.top + other.size <= slot.top + 0.01
        expect(apart).toBe(true)
      })
    })
  })

  it('reads board cells like the mobile labels', () => {
    expect(cellLabel(parseCell('E5'))).toBe('E5')
  })
})

describe('themes', () => {
  it('ships the five mobile presets with their skins', () => {
    expect(presets.map((p) => [p.id, p.price])).toEqual([['classic', 0], ['neon', 12], ['porcelain', 24], ['ember', 39], ['prism', 57]])
    expect(pieceSkins.map((s) => s.material.finish)).toEqual(['gloss', 'neon', 'ceramic', 'satinMetal', 'crystal'])
    expect(diceSkins.map((s) => s.surface)).toEqual(['smooth', 'smooth', 'ceramic', 'stone', 'crystal'])
    expect(boardSkins.map((s) => s.id)).toEqual(['graphite', 'void', 'slate', 'bronze', 'indigo'])
    for (const skin of [...pieceSkins, ...diceSkins, ...boardSkins]) expect(presetFor(skin)).toBeDefined()
    for (const skin of pieceSkins) expect(Object.keys(skin.colors).sort()).toEqual(pieces.map((p) => p.id).sort())
  })

  it('locks skins of presets the player does not own', () => {
    const owned = new Set(['classic', 'neon'])
    expect(isItemUnlocked(pieceSkins[1], owned)).toBe(true)
    expect(isItemUnlocked(diceSkins[4], owned)).toBe(false)
  })

  it('restores per-slot choices, migrates whole-theme ids and falls back to Classic', () => {
    const owned = new Set(['classic', 'neon'])
    localStorage.setItem(appearanceStorageKey, JSON.stringify({ pieces: 'neon', dice: 'ivory', board: 'void' }))
    expect(Object.values(loadAppearance(owned)).map((s) => s.id)).toEqual(['neon', 'ivory', 'void'])
    localStorage.setItem(appearanceStorageKey, 'neon')
    expect(Object.values(loadAppearance(owned)).map((s) => s.id)).toEqual(['neon', 'midnight', 'void'])
    localStorage.setItem(appearanceStorageKey, JSON.stringify({ pieces: 'prism', dice: 'nope', board: 'void' }))
    expect(Object.values(loadAppearance(owned)).map((s) => s.id)).toEqual(['classic', 'ivory', 'void'])
    localStorage.setItem(appearanceStorageKey, '{broken')
    expect(loadAppearance(owned)).toEqual(classicAppearance)
    localStorage.clear()
  })
})
