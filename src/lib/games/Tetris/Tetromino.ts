import { type Vec } from '../gameUtils'

export enum TetrominoType {
  HORIZONTAL, // Also known as I-shape
  LEFT_CORNER,
  RIGHT_CORNER,
  SQUARE,
  STEP_UP_LEFT,
  STEP_UP_RIGHT,
  PYRAMID, // Also known as T-shape
}

const tetrominoShapes: Record<TetrominoType, boolean[][]> = {
  [TetrominoType.HORIZONTAL]: [
    [false, false, false, false],
    [true, true, true, true],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [TetrominoType.LEFT_CORNER]: [
    [true, false, false],
    [true, true, true],
    [false, false, false],
  ],
  [TetrominoType.RIGHT_CORNER]: [
    [false, false, true],
    [true, true, true],
    [false, false, false],
  ],
  [TetrominoType.SQUARE]: [
    [false, true, true, false],
    [false, true, true, false],
    [false, false, false, false],
  ],
  [TetrominoType.STEP_UP_LEFT]: [
    [true, true, false],
    [false, true, true],
    [false, false, false],
  ],
  [TetrominoType.STEP_UP_RIGHT]: [
    [false, true, true],
    [true, true, false],
    [false, false, false],
  ],
  [TetrominoType.PYRAMID]: [
    [false, true, false],
    [true, true, true],
    [false, false, false],
  ],
}

export class Tetromino {
  size: Vec = { x: 3, y: 3 } // Default size for Tetrominoes
  shape: boolean[][] = [
    [false, false, false],
    [false, false, false],
    [false, false, false],
  ] // Default shape, will be overridden by specific Tetromino types

  pos: Vec = { x: 0, y: 0 } // Position of the Tetromino on the grid
  type: TetrominoType // Type of the Tetromino
  static centerPos: Vec = { x: 1, y: 1 } // Center position of the Tetromino

  constructor(type: TetrominoType, pos: Vec) {
    this.type = type
    this.shape = tetrominoShapes[type]
    this.size = { x: this.shape[0].length, y: this.shape.length }
    this.pos = pos
  }

  /**
   * Render this tetromino on the passed electrodes array.
   * @param electrodes - The 2D array of electrodes to render the tetromino
   */
  render(electrodes: boolean[][]) {
    for (let x = 0; x < this.size.x; x++) {
      for (let y = 0; y < this.size.y; y++) {
        if (this.shape[y][x]) {
          const targetY = this.pos.y + y
          const targetX = this.pos.x + x
          if (targetY >= 0 && targetY < electrodes.length && targetX >= 0 && targetX < electrodes[targetY].length) {
            electrodes[targetY][targetX] = true
          }
        }
      }
    }
  }

  /**
   * Rotates a tetromino shape by 90 degrees clockwise or counterclockwise
   * @param shape - The 2D boolean array representing the tetromino shape
   * @param direction - The rotation direction (1 for clockwise, -1 for counterclockwise)
   * @returns The rotated shape as a 2D boolean array
   */
  static rotate(shape: boolean[][], direction: number): boolean[][] {
    const size = shape.length
    const newShape: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (direction === 1) {
          // Clockwise
          newShape[y][x] = shape[size - 1 - x][y]
        } else {
          // Counter-clockwise
          newShape[y][x] = shape[x][size - 1 - y]
        }
      }
    }
    return newShape
  }

  /**
   * Checks if a tetromino shape can be placed at a given position without colliding
   * @param shape - The tetromino shape to test
   * @param pos - The position to test
   * @param electrodes - The game board to check against
   * @returns true if the position is valid, false otherwise
   */
  isValidPosition(shape: boolean[][], pos: Vec, electrodes: boolean[][]): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = pos.x + x
          const boardY = pos.y + y

          // Check bounds
          if (boardX < 0 || boardX >= electrodes[0].length || boardY < 0 || boardY >= electrodes.length) {
            return false
          }

          // Check collision with existing blocks
          if (electrodes[boardY][boardX]) {
            return false
          }
        }
      }
    }
    return true
  }

  static randomTetromino(pos: Vec): Tetromino {
    const types = Object.values(TetrominoType).filter((value) => typeof value === 'number') as TetrominoType[]
    const randomType = types[Math.floor(Math.random() * types.length)]
    return new Tetromino(randomType, pos)
  }
}
