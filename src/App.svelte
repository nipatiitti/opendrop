<script lang="ts">
  import Game from './lib/components/Game.svelte'

  let port = $state<SerialPort | null>(null)
  let speed = $state(300)
  let baudRate = $state(115200)
  let configComplete = $state(false)
  let availablePorts = $state<SerialPort[]>([])

  const requestSerialPorts = async () => {
    if ('serial' in navigator) {
      try {
        const ports = await navigator.serial.getPorts()
        availablePorts = ports
      } catch (error) {
        console.error('Error getting serial ports:', error)
      }
    }
  }

  const requestNewPort = async () => {
    if ('serial' in navigator) {
      try {
        const selectedPort = await navigator.serial.requestPort()
        port = selectedPort

        // Check if the port is already in the list before adding it
        const portExists = availablePorts.some(
          (existingPort) =>
            existingPort.getInfo().usbVendorId === selectedPort.getInfo().usbVendorId &&
            existingPort.getInfo().usbProductId === selectedPort.getInfo().usbProductId
        )

        if (!portExists) {
          availablePorts = [...availablePorts, selectedPort]
        }
      } catch (error) {
        console.error('Error requesting serial port:', error)
        alert('The browser might not support the Web Serial API or the user denied the request.')
      }
    }
  }

  const startGame = async () => {
    if (port) {
      try {
        // Open the port if it's not already open
        if (!port.readable) {
          await port.open({ baudRate })
        }
      } catch (error) {
        console.error('Error opening serial port:', error)
        alert('Failed to open the serial port. Please check the connection and try again.')
        return
      }
    }

    // Wait 1s to ensure the port is ready
    await new Promise((resolve) => setTimeout(resolve, 1000))

    configComplete = true
  }

  // Load available ports on mount
  requestSerialPorts()
</script>

<main style="padding: 0 2rem;">
  {#if !configComplete}
    <div class="config-screen">
      <h1>Tetris Configuration</h1>

      <div class="config-section">
        <h2>Serial Port (Optional)</h2>
        <p>Select a serial port to connect to OpenDrop hardware:</p>

        <div class="port-selection">
          {#if availablePorts.length > 0}
            <label>
              <input type="radio" bind:group={port} value={null} />
              No serial port (simulation mode)
            </label>
            {#each availablePorts as availablePort}
              <label>
                <input type="radio" bind:group={port} value={availablePort} />
                {availablePort.getInfo().usbVendorId} - {availablePort.getInfo().usbProductId}
              </label>
            {/each}
          {:else}
            <p>No serial ports found.</p>
            <label>
              <input type="radio" bind:group={port} value={null} checked />
              No serial port (simulation mode)
            </label>
          {/if}
        </div>

        <button onclick={requestNewPort} class="button"> Connect New Serial Port </button>

        <div class="baud-rate-section">
          <label>
            <span>Baud Rate:</span>
            <input type="number" bind:value={baudRate} min="9600" max="2000000" step="1200" />
          </label>
          <div class="baud-presets">
            <button onclick={() => (baudRate = 9600)} class="button">9600</button>
            <button onclick={() => (baudRate = 115200)} class="button">115200</button>
            <button onclick={() => (baudRate = 921600)} class="button">921600</button>
          </div>
        </div>
      </div>

      <div class="config-section">
        <h2>Game Speed</h2>
        <p>Set the update interval in milliseconds (smaller = faster):</p>
        <label>
          <input type="range" bind:value={speed} min="50" max="1000" step="50" />
          <span>{speed}ms</span>
        </label>
        <div class="speed-presets">
          <button onclick={() => (speed = 100)} class="button">Fast (100ms)</button>
          <button onclick={() => (speed = 300)} class="button">Normal (300ms)</button>
          <button onclick={() => (speed = 500)} class="button">Slow (500ms)</button>
        </div>
      </div>

      <button onclick={startGame} class="button">Start Game</button>
    </div>
  {:else}
    <Game {port} {speed} {baudRate} />
  {/if}
</main>

<style>
  .config-screen {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .config-screen h1 {
    text-align: center;
    color: #f3f3f3;
    margin-bottom: 2rem;
  }

  .config-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #141414;
    width: 100%;

    display: flex;
    flex-direction: column;
  }

  .config-section h2 {
    margin-top: 0;
    color: #f3f3f3;
  }

  .port-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .port-selection label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 6px;
  }

  .port-selection label:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .port-selection input[type='radio'] {
    accent-color: #667eea;
  }

  .baud-rate-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #333;
  }

  .baud-rate-section label {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .baud-rate-section input[type='number'] {
    background: #2a2a2a;
    border: 1px solid #555;
    color: #f3f3f3;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 1rem;
  }

  .baud-presets {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .baud-presets .button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .config-section input[type='range'] {
    width: 80%;
    margin: 1rem 0;
  }

  .speed-presets {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
    justify-content: space-around;
  }

  .button {
    background: #c0c0c0;
    color: #202020;
    border: none;
    padding: 0.75rem 2.5rem;
    font-weight: 700;
    border-radius: 12px;
  }

  .button:hover {
    opacity: 0.9;
  }
</style>
