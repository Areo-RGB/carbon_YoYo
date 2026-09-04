<script lang="ts">
  import { Button, InlineNotification, Slider, Tile, Toggle } from 'carbon-components-svelte';
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import { activeTab } from '../state/app.ts';
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
  <ScreenTitle
    eyebrow="Configuration"
    title="Settings"
    description="Audio, preferences, and multi-device sync."
  />

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

  <Tile class="section-gap">
    <strong>Tablet Wi-Fi Sync Server & Remote Phones</strong>
    <p class="setting-hint" style="margin: 0.5rem 0 1rem 0;">
      Turn this tablet into a local host server over Wi-Fi Hotspot. Assistant coaches can open a web browser on their phones to view live shuttle updates and log athlete misses/outs in real time.
    </p>
    <Button size="small" kind="primary" on:click={() => activeTab.set('sync')}>
      Open Wi-Fi Sync Settings
    </Button>
  </Tile>
</section>
