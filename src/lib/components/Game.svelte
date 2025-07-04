<script lang="ts">
  import { onMount } from 'svelte'
  import { Dir, Tetris } from '../games/Tetris/Tetris'
  import OpenDrop from './OpenDrop.svelte'

  type Props = {
    speed?: number
    port?: SerialPort | null
    baudRate?: number
  }
  let { speed = 300, port, baudRate = 115200 }: Props = $props()

  let tetris = new Tetris()
  tetris.movementDelay = speed // Set the speed of the game

  let electrodes = $state.raw(tetris.electrodes)
  let highlighted = $state.raw(tetris.needFilling)

  const loop = async () => {
    await tetris.update()

    requestAnimationFrame(loop)
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
        tetris.setMovement(Dir.LEFT)
        break
      case 'ArrowRight':
      case 'd':
        tetris.setMovement(Dir.RIGHT)
        break
      case 'r':
        tetris.aboutRotate = true // Set the rotating flag to true
        break
    }
  }

  onMount(() => {
    tetris.onTransmit = async (packet, game) => {
      electrodes = game.electrodes
      highlighted = game.needFilling

      // Send the packet to the OpenDrop hardware
      if (port) {
        try {
          // Open the port if it's not already open
          if (!port.readable) {
            await port.open({ baudRate })
          }
          
          const writer = port.writable.getWriter()
          await writer.write(packet)
          writer.releaseLock()
        } catch (error) {
          console.error('Error communicating with serial port:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    const run = async () => {
      await tetris.init()
      loop()
    }
    run()

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  })
</script>

<main>
  <OpenDrop {electrodes} {highlighted} />
</main>
