import { dispenseDropFrame, dispenseSequence, distance, Reservoir, reverseNibble, type Vec } from './gameUtils'

/**
 * This represents a game state for the OpenDrop hardware. The board is 16x8 where the first and last columns are reserved for special
 * dispensing electrodes. The game state is represented as a 2D array of booleans, where each boolean represents whether an electrode is active (true) or inactive (false).
 */
export class Game {
  // OpenDrop size
  readonly size: Vec = { x: 16, y: 8 }

  // Size without the special columns
  readonly gameSize: Vec = { x: this.size.x - 2, y: this.size.y }
  electrodes: boolean[][] = Array.from({ length: this.gameSize.y }, () => Array(this.gameSize.x).fill(false))

  // Special list of cells we need to fill with water
  needFilling: Vec[] = []
  currentlyMoving: Vec | null = null // The currently moving drop, if any
  availableReservoirs: Reservoir[] = [Reservoir.TL, Reservoir.BL, Reservoir.TR, Reservoir.BR] // Available reservoirs for dispensing

  // Special Electrode States and Reservoir Definitions
  specialElectrodesLeft = 0b00000000 // State of 8 electrodes in column 0
  specialElectrodesRight = 0b00000000 // State of 8 electrodes in column 15

  lastFrame = 0 // Last frame processed
  movementDelay = 400 // Delay for drop movement in milliseconds (default 400ms ~ 2.5 fps)
  cleanupDelay = 75 // Delay for cleanup after dispensing in milliseconds

  onTransmit?: (packet: Uint8Array, game: Game) => void

  /**
   * @param reservoir - The reservoir to get the dispense location for.
   * @returns The location of the dispensed drop in game coordinates.
   */
  getDispenseLocation = (reservoir: Reservoir) => {
    switch (reservoir) {
      case Reservoir.TL:
        return { x: 0, y: 1 }
      case Reservoir.BL:
        return { x: 0, y: this.gameSize.y - 2 }
      case Reservoir.TR:
        return { x: this.gameSize.x - 2, y: 1 }
      case Reservoir.BR:
        return { x: this.gameSize.x - 2, y: this.gameSize.y - 2 }
    }
  }
  /**
   * The update loop is meant to be called by requestAnimationFrame or a similar mechanism. It will call the tick loop at a fixed interval.
   * @param deltaMS - The time since the last update in milliseconds.
   * @returns void
   */
  update = async (): Promise<void> => {
    const current = Date.now()
    const delta = current - this.lastFrame

    let newTick = false // Flag to indicate if we need to call the tick function
    if (delta > this.movementDelay) {
      newTick = true // If enough time has passed, we need to call the tick function
      this.lastFrame = current // Update the last frame time
    }

    if (newTick) {
      if (this.needFilling.length > 0) {
        await this.fillTick()
      } else {
        await this.tick()
      }
    }

    this.render() // Call the render function to update the display
    await this.transmit() // Transmit the current state to the OpenDrop board
  }

  tick: () => Promise<void> = async () => {
    // Default implementation - meant to be overridden by subclasses
  }

  render() {
    // If this is called we assume the extending class has already set the electrodes array to it's desired state.

    // Render the currently moving drop if it exists
    if (this.currentlyMoving) {
      this.electrodes[this.currentlyMoving.y][this.currentlyMoving.x] = true // Activate the currently moving drop electrode
    }
  }

  fillTick = async () => {
    // Always assume we are filling the first drop in the needFilling array
    if (this.needFilling.length === 0) return // Nothing to fill

    const electrodeToFill = this.needFilling[0]

    if (!this.currentlyMoving) {
      // Find the closest reservoir to the electrode to fill
      let closestReservoir: Reservoir | null = null
      let closestDistance = Infinity

      for (const reservoir of this.availableReservoirs) {
        const reservoirLocation = this.getDispenseLocation(reservoir)
        const dist = distance(electrodeToFill, reservoirLocation)

        if (dist < closestDistance) {
          closestDistance = dist
          closestReservoir = reservoir
        }
      }

      if (closestReservoir === null) {
        console.error('No available reservoir found to fill the drop.')
        return
      }

      console.log(
        `Dispensing drop from reservoir ${closestReservoir} to fill electrode at ${electrodeToFill.x},${electrodeToFill.y}`
      )

      this.currentlyMoving = await this.dispense(closestReservoir)
      console.log(`Drop dispensed at ${this.currentlyMoving.x},${this.currentlyMoving.y}`)
      return
    }

    // Find the path from the currently moving drop to the electrode to fill
    console.log(
      `Finding path from currently moving drop at ${this.currentlyMoving.x},${this.currentlyMoving.y} to electrode at ${electrodeToFill.x},${electrodeToFill.y}`
    )
    const path = this.findPath(this.currentlyMoving, electrodeToFill)
    console.log(`Path found: ${path.map((p) => `(${p.x},${p.y})`).join(' -> ')}`)

    if (path.length === 0) {
      console.error('No path found to the electrode to fill.')
      return
    }

    // Move the drop for 1 step along the path
    const nextStep = path[0]

    console.log(`Moving drop from ${this.currentlyMoving.x},${this.currentlyMoving.y} to ${nextStep.x},${nextStep.y}`)

    this.electrodes[nextStep.y][nextStep.x] = true // Activate the electrode at the next step
    this.electrodes[this.currentlyMoving.y][this.currentlyMoving.x] = false // Deactivate the previous electrode
    this.currentlyMoving = nextStep // Update the currently moving drop position

    // If we reached the electrode to fill, remove it from the needFilling array
    if (nextStep.x === electrodeToFill.x && nextStep.y === electrodeToFill.y) {
      this.needFilling.shift() // Remove the first element from the needFilling array
      this.currentlyMoving = null // Reset the currently moving drop
    }
  }

  /**
   * Build the array of bytes to be sent to the OpenDrop board trough SerialPort (TODO)
   */
  transmit = async () => {
    // We build a 32-byte packet and send it in one go.
    // Packet structure:
    // [0]      : Left special electrodes (col 0)
    // [1-14]   : Main 14x8 grid (cols 1-14)
    // [15]     : Right special electrodes (col 15)
    // [16-17]  : Dummy bytes for legacy hardware
    // [18-31]  : 14 control bytes (unused for now)
    const packet = new Uint8Array(32)

    // Set the left special electrodes
    packet[0] = this.specialElectrodesLeft

    // Set the main grid electrodes (pack by columns, not rows)
    for (let x = 0; x < this.gameSize.x; x++) {
      let colByte = 0
      for (let y = 0; y < this.gameSize.y; y++) {
        if (this.electrodes[y][x]) {
          colByte |= 1 << y // Set the bit for the electrode at row y
        }
      }
      packet[x + 1] = colByte // Store the column byte in the packet
    }

    // Set the right special electrodes
    packet[15] = this.specialElectrodesRight

    // Set the dummy bytes for legacy hardware
    packet[16] = 0
    packet[17] = 0

    // Set the control bytes (unused for now)
    for (let i = 18; i < 32; i++) {
      packet[i] = 0
    }

    if (this.onTransmit) {
      this.onTransmit(packet, this) // Call the onTransmit callback if defined
    }
  }

  /**
   * Helper function to apply a 4-bit nibble to the correct special electrode byte.
   * @param reservoirId - The ID of the reservoir (Reservoir.TL, Reservoir.BL, Reservoir.TR, Reservoir.BR).
   * @param nibble - The 4-bit nibble to apply (0-15).
   * @returns void
   */
  updateReservoirState = (reservoirId: Reservoir, nibble: number) => {
    // Note: nibble is treated as the 4 LSBs (e.g., 0b00001110)
    if (reservoirId === Reservoir.TL) {
      // Lower nibble of Left byte
      this.specialElectrodesLeft = (this.specialElectrodesLeft & 0xf0) | (nibble & 0x0f)
    } else if (reservoirId === Reservoir.BL) {
      // Upper nibble of Left byte
      this.specialElectrodesLeft = (this.specialElectrodesLeft & 0x0f) | (nibble << 4)
    } else if (reservoirId === Reservoir.TR) {
      // Lower nibble of Right byte
      this.specialElectrodesRight = (this.specialElectrodesRight & 0xf0) | (nibble & 0x0f)
    } else if (reservoirId === Reservoir.BR) {
      // Upper nibble of Right byte
      this.specialElectrodesRight = (this.specialElectrodesRight & 0x0f) | (nibble << 4)
    }
  }

  /**
   * Run the dispense sequence on any specific reservoir.
   * @param reservoir - The reservoir to run the dispense sequence on.
   * @returns location of the dispensed drop in game coordinates.
   */
  dispense = async (reservoir: Reservoir): Promise<Vec> => {
    const dropLocation = this.getDispenseLocation(reservoir)

    // Start by turning off all electrodes of the target reservoir
    this.updateReservoirState(reservoir, 0b0000)
    await this.transmit()

    // Wait for the reservoir to stabilize
    await this.delay(this.cleanupDelay)

    // Run the dispense sequence
    for (let i = 0; i < dispenseSequence.length; i++) {
      let nibble = dispenseSequence[i] as number

      // Reverse the nibble for the bottom side reservoirs
      if (reservoir === Reservoir.BL || reservoir === Reservoir.BR) {
        nibble = reverseNibble(nibble)
      }

      // Update the reservoir state with the current nibble
      this.updateReservoirState(reservoir, nibble)

      // On the handoff frame, place the drop
      if (i === dispenseDropFrame) {
        this.electrodes[dropLocation.y][dropLocation.x] = true
      }

      // Transmit the current state to the OpenDrop board
      await this.transmit()
      await this.delay(this.movementDelay)
    }

    // After the sequence, clean up the electrodes
    let defaultNibble = 0b1000
    if (reservoir === Reservoir.BL || reservoir === Reservoir.BR) {
      defaultNibble = reverseNibble(defaultNibble)
    }
    this.updateReservoirState(reservoir, defaultNibble)
    await this.transmit()
    await this.delay(this.cleanupDelay) // Wait for the board to stabilize after dispensing

    return dropLocation // Return the location of the dispensed drop
  }

  clear = async (): Promise<void> => {
    // Clear the game state
    this.electrodes = Array.from({ length: this.gameSize.y }, () => Array(this.gameSize.x).fill(false))
    this.specialElectrodesLeft = 0b00000000 // Reset left special electrodes
    this.specialElectrodesRight = 0b00000000 // Reset right special electrodes
    await this.transmit()
  }

  /**
   * Async await delay of `ms` milliseconds.
   * @param ms - The number of milliseconds to delay.
   * @returns A promise that resolves after the specified delay.
   */
  delay = async (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Find path of movements from A to B.
   * @param start - The starting position in game coordinates.
   * @param end - The ending position in game coordinates.
   * @returns An array of Vec objects representing the path from start to end (excluding start position).
   */
  findPath = (start: Vec, end: Vec): Vec[] => {
    // Simple implementation using Manhattan distance (no diagonals)
    const path: Vec[] = []
    let current = { x: start.x, y: start.y }

    // Move horizontally first, then vertically
    while (current.x !== end.x || current.y !== end.y) {
      if (current.x !== end.x) {
        // Move one step in x direction
        current.x += current.x < end.x ? 1 : -1
      } else if (current.y !== end.y) {
        // Move one step in y direction
        current.y += current.y < end.y ? 1 : -1
      }

      // Add the new position to the path (excluding start position)
      path.push({ x: current.x, y: current.y })
    }

    return path
  }
}
