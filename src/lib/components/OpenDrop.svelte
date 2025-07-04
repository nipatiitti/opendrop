<script lang="ts">
  import type { Vec } from '../games/gameUtils'

  type Props = {
    electrodes: boolean[][]
    highlighted: Vec[]
  }
  let { electrodes, highlighted }: Props = $props()
  console.log('OpenDrop', electrodes, highlighted)

  // Calculate grid dimensions dynamically
  let rows = $derived(electrodes.length)
  let cols = $derived(electrodes?.[0]?.length || 0)
</script>

<div class="open-drop">
  <div class="electrodes" style="--grid-cols: {cols}; --grid-rows: {rows};">
    {#each electrodes as row, rowIndex}
      {#each row as on, colIndex}
        {@const highlight = highlighted.some((v) => v.x === colIndex && v.y === rowIndex)}
        <div class="electrode" class:active={on} class:highlighted={highlight}>
          {colIndex},{rowIndex}
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .open-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .electrodes {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols, 16), 40px);
    grid-template-rows: repeat(var(--grid-rows, 8), 40px);
    gap: 2px;
  }

  .electrode {
    width: 40px;
    height: 40px;
    background: lightgray;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .electrode.active {
    background: green;
  }

  .electrode.highlighted {
    border: 2px solid orange;
    margin: -2px;
  }
</style>
