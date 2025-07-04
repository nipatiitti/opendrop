import { Game } from '../Game'
import { Reservoir, vecAdd, type Vec } from '../gameUtils'
import { Tetromino } from './Tetromino'

export enum Dir {
  LEFT,
  RIGHT,
  DOWN,
}

export const Directions: Record<Dir, Vec> = {
  [Dir.LEFT]: { x: -1, y: 0 },
  [Dir.RIGHT]: { x: 1, y: 0 },
  [Dir.DOWN]: { x: 0, y: +1 },
}

export class Tetris extends Game {
  // This is the array of electrodes we will be operating on, and this will be transposed to render the actual game state.
  // This way we can think in the correct orientation.
  gameElectrodes: boolean[][] = Array.from({ length: this.gameSize.x }, () => Array(this.gameSize.y).fill(false))

  // Array identical to gameElectrodes, but used to hold already "dead" tetrominos.
  currentBlocks: boolean[][] = Array.from({ length: this.gameSize.x }, () => Array(this.gameSize.y).fill(false))

  // Default spawn position for Tetrominoes
  tetroSpawnPosition = { x: Math.ceil(this.gameSize.y / 2 - 2), y: 1 }
  droppingTetro = Tetromino.randomTetromino(this.tetroSpawnPosition) // Randomly generated Tetromino at the spawn position

  finished = false // Flag to indicate if the game is finished
  topLevel = 3 // The top level of the game, if currentBlocks is filled to this level, the game is over

  moving: Dir = Dir.DOWN // The direction the Tetromino is currently moving

  // Rotation is a bit cumbersome with the OpenDrop hardware, so some additional checks for that
  // Basically the idea is to gather all the water at centerPos and then out again to the sides.
  aboutRotate = false // Flag to indicate if the Tetromino should rotate instead of moving on the next tick
  rotationState: 'not-rotating' | 'starting' | 'coalesce' | 'ending' = 'not-rotating' // State of the rotation process
  newShape: boolean[][] = [] // The new shape of the Tetromino after rotation

  init = async () => {
    await this.clear() // Clear the game state before starting

    // Set default state for all reservoirs to keep electrode 0 active
    // The upper nibble (BL/BR) is the reverse of the lower nibble (TL/TR)
    this.specialElectrodesLeft = 0b00011000 // BL (rev) | TL (normal)
    this.specialElectrodesRight = 0b00011000 // BR (rev) | TR (normal)

    // Only allow filling from the top-left and bottom-left reservoirs
    this.availableReservoirs = [Reservoir.TL, Reservoir.BL]

    this.primeDroppingTetro() // Prime the dropping Tetromino
  }

  tick: () => Promise<void> = async () => {
    if (this.finished) return // If the game is finished, do not process further

    if (this.aboutRotate) {
      this.testRotations(1) // Test clockwise rotation
      this.aboutRotate = false // Reset the rotation flag
    }

    // Move the Tetromino in the current direction if it didn't rotate
    if (this.rotationState === 'not-rotating') {
      this.move(this.moving)
    } else {
      this.applyRotation() // Apply the rotation if in the rotation state
    }

    if (this.hasLanded(this.droppingTetro.pos, this.droppingTetro.shape)) {
      this.resetRotationState() // Reset the rotation state if the Tetromino landed mid rotation

      // If the Tetromino has landed, we need to finalize it
      this.finalizeTetromino()

      // Check if the game is finished
      if (this.currentBlocks[this.topLevel].some((cell) => cell)) {
        this.finished = true // Set the game as finished if the top level is filled
        console.log('Game Over!') // Log game over message
      }

      // If not done, generate a new Tetromino
      if (!this.finished) {
        this.droppingTetro = Tetromino.randomTetromino(this.tetroSpawnPosition)
        this.primeDroppingTetro() // Prime the new Tetromino for the next
      }
    }
  }

  render = () => {
    this.clearGameElectrodes() // Clear the gameElectrodes array before rendering

    // Render the current blocks (already dead Tetrominoes)
    for (let x = 0; x < this.gameSize.x; x++) {
      for (let y = 0; y < this.gameSize.y; y++) {
        if (this.currentBlocks[x][y]) {
          this.gameElectrodes[x][y] = true // Set the electrode to true if it's part of a dead Tetromino
        }
      }
    }

    if (this.needFilling.length > 0) {
      // We haven't yet completely primed the dropping Tetromino, so we won't render it fully yet
      // But we must render the parts of it that are NOT in the needFilling array
      this.droppingTetro.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            const tetrisCoords = { x: this.droppingTetro.pos.x + x, y: this.droppingTetro.pos.y + y }
            const gameCoords = this.tetrisCoordToGameCoord(tetrisCoords)
            if (!this.needFilling.some((coord) => coord.x === gameCoords.x && coord.y === gameCoords.y)) {
              this.gameElectrodes[tetrisCoords.y][tetrisCoords.x] = true // Render the Tetromino part that is not in needFilling
            }
          }
        })
      })
    } else if (this.droppingTetro) {
      if (this.rotationState !== 'not-rotating') {
        switch (this.rotationState) {
          case 'coalesce':
            console.log(`Rendering Tetromino in rotation state: ${this.rotationState}`)
            // Render the tetromino as a single block in the center position
            const centerPos = vecAdd(this.droppingTetro.pos, Tetromino.centerPos)
            this.gameElectrodes[centerPos.y][centerPos.x] = true // Render
            break
          default:
            console.log(`Rotation state ${this.rotationState} not handled in render.`)
            // Render the Tetromino in its current position
            this.droppingTetro.render(this.gameElectrodes)
            break
        }
      } else {
        // If the dropping Tetromino is fully primed and not rotating
        this.droppingTetro.render(this.gameElectrodes)
      }
    } else {
      // If there's no dropping Tetromino, we can generate a new one
      this.droppingTetro = Tetromino.randomTetromino(this.tetroSpawnPosition)
      this.primeDroppingTetro() // Prime the new Tetromino
    }

    this.electrodes = this.transposeElectrodes()
    super.render() // Call the parent class's render method to update the electrodes
  }

  setMovement = (direction: Dir) => {
    if (this.finished) return // If the game is finished, do not allow movement
    this.moving = direction // Set the current movement direction
  }

  private isValidMove = (pos: Vec, shape: boolean[][]): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue // Skip empty cells
        const targetX = pos.x + x
        const targetY = pos.y + y

        // Check if the position is out of bounds or collides with existing blocks
        if (
          targetX < 0 ||
          targetX >= this.gameSize.y ||
          targetY < 0 ||
          targetY >= this.gameSize.x ||
          this.currentBlocks[targetY][targetX] // Collides with existing blocks
        ) {
          return false // Invalid move if out of bounds or collides with existing blocks
        }
      }
    }
    return true
  }

  /**
   * Check if this move puts any of the Tetromino's blocks in contact with existing blocks or on the level of ground.
   * @param pos
   * @param shape
   */
  private hasLanded = (pos: Vec, shape: boolean[][]): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue // Skip empty cells
        const targetX = pos.x + x
        const targetY = pos.y + y

        // Check if 1 cell below each block is occupied by an existing block or if it's out of bounds
        const belowY = targetY + 1
        if (
          belowY >= this.gameSize.x || // Out of bounds (ground level)
          this.currentBlocks[belowY][targetX] // Contact with existing blocks
        ) {
          return true // Tetromino has landed if any block is in contact with the ground or existing blocks
        }
      }
    }
    return false
  }

  private move = async (direction: Dir) => {
    const moveVector = Directions[direction]
    let newPos = vecAdd(this.droppingTetro.pos, moveVector)

    // Is this valid move?
    if (this.isValidMove(newPos, this.droppingTetro.shape)) {
      // Move the Tetromino if the move is valid
      this.droppingTetro.pos = newPos
    }

    // Reset moving direction for the next tick
    this.moving = Dir.DOWN
  }

  private testRotations = (dir: number) => {
    // Always rotate clockwise
    const newShape = Tetromino.rotate(this.droppingTetro.shape, dir)

    // Check if the new shape is valid in the current position
    if (this.isValidMove(this.droppingTetro.pos, newShape)) {
      // If the rotation is valid, start applying it on the next tick
      this.newShape = newShape // Set the new shape for the Tetromino
      this.rotationState = 'starting' // Set the rotation state to coalesce
      return true // Valid rotation found
    }

    // If no valid rotation was found, return false
    return false
  }

  applyRotation = () => {
    console.log('Applying rotation state:', this.rotationState)
    switch (this.rotationState) {
      case 'not-rotating':
        return
      case 'starting':
        this.rotationState = 'coalesce'
        break
      case 'coalesce':
        this.droppingTetro.shape = this.newShape
        this.rotationState = 'ending'
        break
      case 'ending':
        this.rotationState = 'not-rotating'
        break
    }
  }

  resetRotationState = () => {
    this.rotationState = 'not-rotating'
  }

  finalizeTetromino = () => {
    // Add the Tetromino's blocks to the currentBlocks grid
    this.droppingTetro.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const targetX = this.droppingTetro.pos.x + x
          const targetY = this.droppingTetro.pos.y + y
          this.currentBlocks[targetY][targetX] = true
        }
      })
    })
  }

  /**
   * This functions idea is to load the fluxlets of the OpenDrop with water in the location of the dropping Tetromino.
   * It will prime the dropping Tetromino to be dispensed in the next frame.
   */
  private primeDroppingTetro = () => {
    const shapeInWorldCoords = this.droppingTetro.shape
      .map((row, y) =>
        row.map((cell, x) => {
          if (cell) {
            const tetrisCoords = { x: this.droppingTetro.pos.x + x, y: this.droppingTetro.pos.y + y }
            return this.tetrisCoordToGameCoord(tetrisCoords)
          }
          return null
        })
      )
      .filter((row) => row.some((cell) => cell !== null))
      .flat()
      .filter((cell) => cell !== null)

    console.log('Priming dropping in location:', shapeInWorldCoords)

    // The Game won't call tick until this shape is filled with water
    this.needFilling.push(...shapeInWorldCoords)
  }

  private clearGameElectrodes = () => {
    // Clear the gameElectrodes array
    this.gameElectrodes = Array.from({ length: this.gameSize.x }, () => Array(this.gameSize.y).fill(false))
  }

  private transposeElectrodes = () => {
    const transposed: boolean[][] = Array.from({ length: this.gameSize.y }, () => Array(this.gameSize.x).fill(false))
    for (let x = 0; x < this.gameSize.x; x++) {
      for (let y = 0; y < this.gameSize.y; y++) {
        transposed[this.gameSize.y - 1 - y][x] = this.gameElectrodes[x][y]
      }
    }
    return transposed
  }

  private tetrisCoordToGameCoord = (coord: Vec): Vec => {
    // (2,2) => (2,5)
    // (5,2) => (2,2)

    return {
      x: coord.y,
      y: this.gameSize.y - 1 - coord.x,
    }
  }
}
