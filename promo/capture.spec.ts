import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { parseCell } from '../src/game/cells'
import { levelForRoll, rollShowing } from '../src/game/dice'
import { pieceById, pieces, sampleLevel } from '../src/game/pieces'
import { flipOrientationHorizontally, rotateOrientationClockwise, shapeBounds, transformCells } from '../src/game/transforms'
import type { Orientation, Placement } from '../src/game/types'

/*
 * Catalog materials for Yandex Games, captured from the real Yandex build
 * (dist-yandex served with the SDK stand-in): screenshots and gameplay
 * videos for each language, plus the icon and cover.
 *
 *   npm run promo:yandex   →   release/yandex-store/
 */

const gameURL = 'http://127.0.0.1:5177/'
const coverURL = 'http://127.0.0.1:5178/promo/cover.html'
const root = join(import.meta.dirname, '..')
const out = join(root, 'release', 'yandex-store')
const langs = ['ru', 'en'] as const
type Lang = (typeof langs)[number]
const copy = { ru: { play: 'Играть', continue: /^Продолжить/ }, en: { play: 'Play', continue: /^Continue/ } }

const devices = {
  // 9:16 at 1080×1920 and 16:9 at 1920×1080.
  mobile: { viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5 },
  desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
}
type Device = keyof typeof devices

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

// ---- Storage ---------------------------------------------------------------

const themes = {
  classic: { pieces: 'classic', dice: 'ivory', board: 'graphite' },
  neon: { pieces: 'neon', dice: 'midnight', board: 'void' },
  porcelain: { pieces: 'porcelain', dice: 'frost', board: 'slate' },
  ember: { pieces: 'ember', dice: 'sandstone', board: 'bronze' },
  prism: { pieces: 'prism', dice: 'amethyst', board: 'indigo' },
}

function savedGame(placed: readonly Placement[], orientations: Record<string, Orientation> = {}, hintsRemaining = 3) {
  const label = (cell: { row: number; col: number }) => `${String.fromCharCode(65 + cell.row)}${cell.col + 1}`
  return {
    schemaVersion: 1,
    blocked: sampleLevel.blockedCells.map(label),
    orientations: { ...orientations, ...Object.fromEntries(placed.map((p) => [p.pieceId, p.orientation])) },
    placements: placed.map((p) => ({ pieceId: p.pieceId, origin: label(p.origin), orientation: p.orientation })),
    elapsedMs: 41_000,
    hintsRemaining,
    assistanceUsed: false,
  }
}

async function prepare(page: Page, lang: Lang, theme: keyof typeof themes, saved?: object) {
  await page.addInitScript(({ theme, saved }) => {
    localStorage.clear()
    localStorage.setItem('qybeq.progress.v1', JSON.stringify({
      availableStars: 18,
      solvedPuzzleCount: 42,
      unlockedThemeIds: ['classic', 'neon', 'porcelain', 'ember', 'prism'],
      dailyBestStars: {},
    }))
    localStorage.setItem('qybeq.appearance.v1', JSON.stringify(theme))
    localStorage.setItem('qybeq.tips.v1', JSON.stringify({ rotate: true, place: true }))
    if (saved) localStorage.setItem('qybeq.savedGame.v1', JSON.stringify(saved))
  }, { theme: themes[theme], saved })
  await page.goto(`${gameURL}?ya_lang=${lang}`)
}

async function continueGame(page: Page, lang: Lang) {
  await page.getByRole('button', { name: copy[lang].continue }).click()
  await expect(page.locator('.board-grid')).toBeVisible()
  await page.waitForTimeout(900)
}

// ---- Pointer ---------------------------------------------------------------

/** A soft touch mark that follows the pointer, so the video shows the hand. */
async function showTouches(page: Page) {
  await page.addInitScript(() => {
    const install = () => {
      const dot = document.createElement('div')
      dot.style.cssText = 'position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.65);box-shadow:0 2px 12px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .2s,transform .12s'
      document.documentElement.appendChild(dot)
      let x = 0
      let y = 0
      let down = false
      const paint = () => { dot.style.transform = `translate(${x}px, ${y}px) scale(${down ? 0.78 : 1})` }
      window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.opacity = '1'; paint() }, true)
      window.addEventListener('pointerdown', (e) => { x = e.clientX; y = e.clientY; down = true; dot.style.opacity = '1'; paint() }, true)
      window.addEventListener('pointerup', () => { down = false; paint() }, true)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install)
    else install()
  })
}

const pointer = new WeakMap<Page, { x: number; y: number }>()

/** Moves like a hand: eased, taking [ms] of real time however slow each step is. */
async function glide(page: Page, x: number, y: number, ms = 450) {
  const from = pointer.get(page) ?? { x: x - 60, y: y + 120 }
  const start = Date.now()
  for (;;) {
    const t = Math.min(1, (Date.now() - start) / ms)
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e)
    if (t >= 1) break
  }
  pointer.set(page, { x, y })
}

async function center(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`No box for ${selector}`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function tap(page: Page, selector: string, travel = 380) {
  const at = await center(page, selector)
  await glide(page, at.x, at.y, travel)
  await page.mouse.down()
  await page.waitForTimeout(70)
  await page.mouse.up()
}

async function boardTarget(page: Page, placement: Placement) {
  const grid = await page.locator('.board-grid').boundingBox()
  if (!grid) throw new Error('No board')
  const cell = grid.width / 6
  const bounds = shapeBounds(transformCells(pieceById(placement.pieceId).cells, placement.orientation))
  return { x: grid.x + (placement.origin.col + bounds.cols / 2) * cell, y: grid.y + (placement.origin.row + bounds.rows / 2) * cell }
}

/** Picks a tray piece up and carries it over its spot; [release] drops it. */
async function carry(page: Page, placement: Placement, { release = true, ms = 620, offset = { x: 0, y: 0 } } = {}) {
  const from = await center(page, `[data-piece="${placement.pieceId}"]`)
  await glide(page, from.x, from.y, 360)
  await page.mouse.down()
  await page.waitForTimeout(90)
  const to = await boardTarget(page, placement)
  const cell = ((await page.locator('.board-grid').boundingBox())?.width ?? 0) / 6
  await glide(page, to.x + offset.x * cell, to.y + offset.y * cell, ms)
  if (release) {
    await page.waitForTimeout(80)
    await page.mouse.up()
  }
}

const shapeKey = (cells: { row: number; col: number }[]) => cells.map((c) => `${c.row},${c.col}`).sort().join(' ')

/** The fewest taps (rotate) and Flips from the tray orientation to [target]. */
function actionsFor(placement: Placement): ('tap' | 'flip')[] {
  const piece = pieceById(placement.pieceId)
  const goal = shapeKey(transformCells(piece.cells, placement.orientation))
  const start: Orientation = { quarterTurns: 0, mirrored: false }
  const queue: { o: Orientation; path: ('tap' | 'flip')[] }[] = [{ o: start, path: [] }]
  while (queue.length) {
    const { o, path } = queue.shift()!
    if (shapeKey(transformCells(piece.cells, o)) === goal) return path
    if (path.length > 5) continue
    // As the game does: only pieces that may turn or mirror do; Flip acts on
    // the selected piece, so it needs a tap first.
    if (piece.allowRotation) queue.push({ o: rotateOrientationClockwise(o), path: [...path, 'tap'] })
    if (piece.allowMirror && path.includes('tap')) queue.push({ o: flipOrientationHorizontally(o), path: [...path, 'flip'] })
  }
  throw new Error(`No way to orient ${placement.pieceId}`)
}

// ---- Screenshots ---------------------------------------------------------------

const solution = sampleLevel.referenceSolution
const byId = (id: string) => solution.find((p) => p.pieceId === id)!

const scenes: { name: string; theme: keyof typeof themes; run: (page: Page, lang: Lang) => Promise<void> }[] = [
  {
    // A piece carried over the board, its outline showing where it lands.
    name: '01-drag',
    theme: 'classic',
    run: async (page, lang) => {
      const target = byId('elbow3')
      await prepare(page, lang, 'classic', savedGame(['line4', 'tee', 'elbow4', 'flare'].map(byId), { elbow3: target.orientation }))
      await continueGame(page, lang)
      // Held a little off its spot: lifted, with the outline below.
      await carry(page, target, { release: false, offset: { x: -0.3, y: -0.4 } })
      await page.waitForTimeout(350)
    },
  },
  {
    // Six dice tumbling onto the board.
    name: '02-dice',
    theme: 'neon',
    run: async (page, lang) => {
      await prepare(page, lang, 'neon')
      await page.getByRole('button', { name: copy[lang].play, exact: true }).click()
      await page.locator('.roll-dice-button').click()
      await page.waitForTimeout(380)
    },
  },
  {
    // A hint: the dashed outline of the next move.
    name: '03-hint',
    theme: 'ember',
    run: async (page, lang) => {
      await prepare(page, lang, 'ember', savedGame(['line4', 'tee', 'domino'].map(byId)))
      await continueGame(page, lang)
      await page.locator('.hint-pill').click()
      await page.waitForTimeout(700)
    },
  },
  {
    // Solved: the board filled and the stars earned.
    name: '04-solved',
    theme: 'prism',
    run: async (page, lang) => {
      await prepare(page, lang, 'prism', savedGame(solution.filter((p) => p.pieceId !== 'square')))
      await continueGame(page, lang)
      await page.locator('[data-piece="square"]').focus()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(4200)
    },
  },
]

for (const lang of langs) {
  for (const device of Object.keys(devices) as Device[]) {
    for (const scene of scenes) {
      test(`screenshot ${lang} ${device} ${scene.name}`, async ({ browser }) => {
        const context = await browser.newContext({ ...devices[device], locale: lang })
        const page = await context.newPage()
        await scene.run(page, lang)
        mkdirSync(join(out, lang, `screenshots-${device}`), { recursive: true })
        await page.screenshot({ path: join(out, lang, `screenshots-${device}`, `${scene.name}.jpg`), type: 'jpeg', quality: 92 })
        await context.close()
      })
    }
  }
}

// ---- Videos ---------------------------------------------------------------

/** Records the page with the DevTools screencast and encodes an MP4. */
async function record(page: Page, file: string, size: { width: number; height: number }, run: () => Promise<void>) {
  const cdp = await page.context().newCDPSession(page)
  const frames: { data: Buffer; t: number }[] = []
  cdp.on('Page.screencastFrame', (frame) => {
    frames.push({ data: Buffer.from(frame.data, 'base64'), t: frame.metadata.timestamp ?? Date.now() / 1000 })
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined)
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 })
  await run()
  await cdp.send('Page.stopScreencast')
  await cdp.detach()

  const work = join(out, '.frames', file.replace(/\W+/g, '-'))
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })
  const lines: string[] = []
  frames.forEach((frame, i) => {
    const name = `f${String(i).padStart(5, '0')}.jpg`
    writeFileSync(join(work, name), frame.data)
    const next = frames[i + 1]?.t ?? frame.t + 0.6
    lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - frame.t).toFixed(4)}`)
  })
  lines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`)
  writeFileSync(join(work, 'list.txt'), lines.join('\n'))
  const raw = frames.at(-1)!.t - frames[0].t + 0.6
  // Yandex Games takes videos up to 28 s.
  if (raw > 27.8) throw new Error(`The recording is ${raw.toFixed(1)} s, over 28 s`)
  const duration = raw
  const music = join(root, 'public', 'audio', 'quiet_geometry.mp3')
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'),
    '-i', music,
    '-vf', `scale=${size.width}:${size.height}:flags=lanczos,fps=30,format=yuv420p`,
    '-af', `volume=0.8,afade=t=in:st=0:d=0.8,afade=t=out:st=${(duration - 1.6).toFixed(2)}:d=1.6`,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '160k',
    '-t', duration.toFixed(2), '-movflags', '+faststart', file,
  ])
  rmSync(work, { recursive: true, force: true })
  return { frames: frames.length, duration }
}

for (const lang of langs) {
  for (const [orientation, device, size] of [
    ['horizontal', 'desktop', { width: 1920, height: 1080 }],
    ['vertical', 'mobile', { width: 1080, height: 1920 }],
  ] as const) {
    test(`video ${lang} ${orientation}`, async ({ browser }) => {
      const context = await browser.newContext({ ...devices[device], locale: lang })
      const page = await context.newPage()
      // The same roll every time, so both languages show the same game.
      await page.addInitScript(() => {
        let seed = 20260929
        Math.random = () => {
          seed = (seed + 0x6d2b79f5) | 0
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      })
      await showTouches(page)
      await page.addInitScript(() => {
        localStorage.clear()
        localStorage.setItem('qybeq.tips.v1', JSON.stringify({ rotate: true, place: true }))
      })
      mkdirSync(join(out, lang, 'video'), { recursive: true })
      const file = join(out, lang, 'video', `qybeq-${orientation}-${lang}.mp4`)
      await page.goto('about:blank')
      const result = await record(page, file, size, async () => {
        await page.goto(`${gameURL}?ya_lang=${lang}`)
        await page.waitForTimeout(1700)
        await tap(page, `text=${copy[lang].play}`)
        await page.waitForTimeout(650)
        await tap(page, '.roll-dice-button')
        await expect(page.locator('.dice-roll-layer')).toHaveCount(0, { timeout: 8000 })
        await page.waitForTimeout(250)

        const labels = await page.locator('.board-grid .tile-art').evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('aria-label') ?? ''))
        const blocked = labels.map(parseCell).sort((a, b) => a.row - b.row)
        const level = levelForRoll(rollShowing(blocked), pieces)
        if (!level) throw new Error('Unsolvable roll')
        // Big pieces first, as a player would.
        const order = [...level.referenceSolution].sort((a, b) => pieceById(b.pieceId).cells.length - pieceById(a.pieceId).cells.length)
        for (const [index, placement] of order.entries()) {
          for (const action of actionsFor(placement)) {
            if (action === 'tap') await tap(page, `[data-piece="${placement.pieceId}"]`, 300)
            else await tap(page, '.pill-button:not(.hint-pill)', 320)
            await page.waitForTimeout(230)
          }
          await carry(page, placement, { ms: 560 })
          await expect(page.locator('.placed-piece')).toHaveCount(index + 1)
          await page.waitForTimeout(160)
        }
        await glide(page, (pointer.get(page)?.x ?? 0) + 40, (pointer.get(page)?.y ?? 0) + 260, 500)
        await page.waitForTimeout(4600)
      })
      console.log(`${file}: ${result.frames} frames, ${result.duration.toFixed(1)} s`)
      await context.close()
    })
  }
}

// ---- Icon and cover --------------------------------------------------------------

test('icon and covers', async ({ browser }) => {
  mkdirSync(out, { recursive: true })
  copyFileSync(join(root, '..', 'GeniusSquare', 'release', 'rustore', 'assets', 'icon-512.png'), join(out, 'icon-512.png'))
  for (const [name, width, height] of [['cover-800x470', 800, 470], ['showcase-1560x520', 1560, 520]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.goto(`${coverURL}?w=${width}&h=${height}`)
    await page.waitForTimeout(1200)
    const big = join(out, `${name}@2x.png`)
    await page.screenshot({ path: big })
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', `scale=${width}:${height}:flags=lanczos,format=rgb24`, join(out, `${name}.png`)])
    rmSync(big)
    await context.close()
  }
})
