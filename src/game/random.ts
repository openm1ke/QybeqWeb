/** The subset of Dart's `Random` the game uses. */
export interface RandomSource {
  nextInt(max: number): number
  nextDouble(): number
  nextBool(): boolean
}

/** Non-deterministic randomness for ordinary puzzles. */
export const browserRandom: RandomSource = {
  nextInt: (max) => Math.floor(Math.random() * max),
  nextDouble: () => Math.random(),
  nextBool: () => Math.random() < 0.5,
}

/** Dart's `List.shuffle(random)`, in place. */
export function shuffle<T>(items: T[], random: RandomSource): T[] {
  let length = items.length
  while (length > 1) {
    const position = random.nextInt(length)
    length -= 1
    const tmp = items[length]
    items[length] = items[position]
    items[position] = tmp
  }
  return items
}
