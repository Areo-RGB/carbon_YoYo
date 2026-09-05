<script lang="ts">
  import { InlineNotification, Slider, Tile, Toggle } from 'carbon-components-svelte';
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import {
    boostEnabled,
    setBoostEnabled,
    setSoundEnabled,
    setVolumeBoost,
    soundEnabled,
    volumeBoost
  } from '../state/testStore.ts';
</script>

<section class="screen">
  <ScreenTitle eyebrow="Configuration" title="Settings" description="Audio and preferences." />

  <Tile class="section-gap">
    <div class="setting-stack">
      <Toggle
        labelText="Sound cues"
        toggled={$soundEnabled}
        on:toggle={(e) => setSoundEnabled(e.detail.toggled)}
      />
      <p class="setting-hint">Muting changes gain only — the protocol clock keeps running.</p>
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <Toggle
        labelText="Audio volume boost"
        toggled={$boostEnabled}
        on:toggle={(e) => setBoostEnabled(e.detail.toggled)}
      />
      {#if $boostEnabled}
        <Slider
          labelText="Boost level"
          min={1}
          max={3}
          step={0.5}
          value={$volumeBoost}
          on:change={(e) => setVolumeBoost(e.detail)}
        />
        <p class="setting-hint">{Math.round($volumeBoost * 100)}%</p>
      {/if}
      {#if $boostEnabled && $volumeBoost > 2}
        <InlineNotification
          kind="warning"
          title="High gain"
          subtitle="High gain can distort on some devices or speakers."
        />
      {/if}
    </div>
  </Tile>
</section>
