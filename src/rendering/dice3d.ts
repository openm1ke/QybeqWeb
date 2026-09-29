import type { DieFrame } from '../game/diceRoll'

/**
 * The perspective projection of the mobile `DiceRollPainter`, with the same
 * `vector_math` matrices (column-major, like CSS `matrix3d`). Faces are
 * drawn in a 100×100 reference space centred on the die.
 */

export type Mat4 = Float64Array

export const ref = 100
const half = ref / 2
/** Camera distance for the perspective, in reference units. */
const camera = ref * 4.2
/** Undo the perspective enlargement of the front face (half a die closer). */
export const frontFaceScale = (camera - half) / camera

const light = normalize(-0.35, -0.55, -0.76)

export function identity(): Mat4 {
  const m = new Float64Array(16)
  m[0] = m[5] = m[10] = m[15] = 1
  return m
}

/** vector_math `entry(row, col)`. */
export function entry(m: Mat4, row: number, col: number): number {
  return m[col * 4 + row]
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16)
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[col * 4 + k]
      out[col * 4 + row] = sum
    }
  }
  return out
}

export function rotationX(angle: number): Mat4 {
  const m = identity()
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  m[5] = c
  m[6] = s
  m[9] = -s
  m[10] = c
  return m
}

export function rotationY(angle: number): Mat4 {
  const m = identity()
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  m[0] = c
  m[2] = -s
  m[8] = s
  m[10] = c
  return m
}

export function rotationZ(angle: number): Mat4 {
  const m = identity()
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  m[0] = c
  m[1] = s
  m[4] = -s
  m[5] = c
  return m
}

export function translation(x: number, y: number, z: number): Mat4 {
  const m = identity()
  m[12] = x
  m[13] = y
  m[14] = z
  return m
}

export function scale(s: number): Mat4 {
  const m = identity()
  m[0] = m[5] = s
  m[10] = 1
  return m
}

const faceTransforms: Mat4[] = [
  translation(0, 0, -half), // front: the rolled face
  multiply(rotationY(Math.PI), translation(0, 0, -half)),
  multiply(rotationY(-Math.PI / 2), translation(0, 0, -half)),
  multiply(rotationY(Math.PI / 2), translation(0, 0, -half)),
  multiply(rotationX(Math.PI / 2), translation(0, 0, -half)),
  multiply(rotationX(-Math.PI / 2), translation(0, 0, -half)),
]

export interface VisibleFace {
  /** Index into the die's six faces (0 = the rolled face). */
  readonly face: number
  /** Projection × model, mapping face space (−50..50) to die space. */
  readonly matrix: Mat4
  readonly depth: number
  /** How directly the face looks at the light, 0..1.15. */
  readonly shade: number
}

/** The faces a camera sees for [frame], far to near. */
export function visibleFaces(frame: DieFrame): VisibleFace[] {
  const view = rotationX(frame.viewTilt)
  const perspective = identity()
  perspective[2 * 4 + 3] = 1 / camera // setEntry(3, 2, 1 / camera)
  const projection = multiply(perspective, view)
  const body = multiply(multiply(rotationZ(frame.rotZ), rotationX(frame.rotX)), rotationY(frame.rotY))
  const reference = dot3(0, Math.sin(frame.viewTilt), -Math.cos(frame.viewTilt))

  const faces: VisibleFace[] = []
  for (let face = 0; face < 6; face += 1) {
    const model = multiply(body, faceTransforms[face])
    const inView = multiply(view, model)
    const nx = -entry(inView, 0, 2)
    const ny = -entry(inView, 1, 2)
    const nz = -entry(inView, 2, 2)
    if (nz > 0.15) continue // facing away from the camera
    faces.push({
      face,
      matrix: multiply(projection, model),
      depth: entry(inView, 2, 3),
      shade: Math.min(1.15, Math.max(0, dot3(nx, ny, nz) / reference)),
    })
  }
  return faces.sort((a, b) => b.depth - a.depth)
}

/**
 * A CSS `matrix3d` placing a 100×100 px element (origin at its top-left) as
 * [face] of a die centred at ([cx], [cy]) whose front face is [side] px.
 */
export function faceCssMatrix(face: VisibleFace, cx: number, cy: number, side: number): string {
  const k = (side / ref) * frontFaceScale
  const m = multiply(multiply(multiply(translation(cx, cy, 0), scale(k)), face.matrix), translation(-half, -half, 0))
  // Depth is irrelevant once flattened; keep z = z_local so the matrix stays
  // invertible and no browser clips it against a near plane.
  m[2] = 0
  m[6] = 0
  m[10] = 1
  m[14] = 0
  return `matrix3d(${Array.from(m, (v) => +v.toFixed(6)).join(',')})`
}

function dot3(x: number, y: number, z: number): number {
  return x * light[0] + y * light[1] + z * light[2]
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}
