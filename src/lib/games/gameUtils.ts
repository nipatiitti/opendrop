export type Vec = { x: number; y: number }

export const vecAdd = (a: Vec, b: Vec): Vec => ({
  x: a.x + b.x,
  y: a.y + b.y,
})

export const vecSub = (a: Vec, b: Vec): Vec => ({
  x: a.x - b.x,
  y: a.y - b.y,
})

export const distance = (a: Vec, b: Vec): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export enum Reservoir {
  TL = 0, // Top-Left
  BL = 1, // Bottom-Left
  TR = 2, // Top-Right
  BR = 3, // Bottom-Right
}

// Sequence of 4-bit nibbles for dispensing. Only works on the top side of the OpenDrop board. Has to be reversed for the bottom side.
export const dispenseSequence = [
  0b1000, // Electrode 0
  0b1100, // Electrode 0 and 1
  0b0111, // Electrode 1, 2 and 3
  0b0001, // Electrode 3 (Drop frame target)
  0b1100, // Electrode 0 and 1
  0b1010, // Electrode 0 and 2
  0b1010, // Electrode 0 and 2
] as const

/**
 * Reverses the bit order of a 4-bit nibble (half-byte).
 *
 * Takes a nibble (4-bit value) and reverses the order of its bits.
 * For example, 0b1010 (10 in decimal) becomes 0b0101 (5 in decimal).
 *
 * Used to reverse the bits of a nibble for dispensing sequences in the OpenDrop game.
 *
 * @param nibble - A 4-bit integer value (0-15) to reverse
 * @returns The nibble with its bits reversed
 */
export const reverseNibble = (nibble: number): number => {
  return ((nibble & 0b0001) << 3) | ((nibble & 0b0010) << 1) | ((nibble & 0b0100) >> 1) | ((nibble & 0b1000) >> 3)
}

export const dispenseDropFrame = 3 // 0-indexed frame where drop moves to main grid.
