<script lang="ts">
  import { Button, InlineNotification, Tile } from 'carbon-components-svelte';
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import DistanceMeter from '../components/DistanceMeter.svelte';
  import AthleteCard from '../components/AthleteCard.svelte';
  import { getProtocol } from '../../domain/protocol.ts';
  import { activeTab, selectedTestType } from '../state/app.ts';
  import {
    athletes,
    pauseTest,
    resumeTest,
    selectedAthletes,
    startTest,
    stopAndFinishTest,
    testState,
    undoDescription,
    undoLastAction
  } from '../state/testStore.ts';

  const protocol = $derived(getProtocol($selectedTestType));
  const list = $derived($athletes.filter((a) => a.isSelected));
  const runningCount = $derived(list.filter((a) => a.status === 'running').length);
  const warnedCount = $derived(list.filter((a) => a.status === 'warned').length);
  const finishedCount = $derived(list.filter((a) => a.status === 'eliminated').length);
</script>

<section class="screen">
  <ScreenTitle
    eyebrow="Live"
    title={protocol.displayName}
    description="Tap Miss to warn an athlete — a second miss finishes them. Out finishes immediately."
  />

  <div class="section-gap">
    <DistanceMeter />
  </div>

  <div class="count-row section-gap">
    <Tile light class="count-tile"><b>{runningCount}</b><span>running</span></Tile>
    <Tile light class="count-tile"><b>{warnedCount}</b><span>warned</span></Tile>
    <Tile light class="count-tile"><b>{finishedCount}</b><span>finished</span></Tile>
  </div>

  {#if $testState === 'idle'}
    <div class="section-gap">
      <InlineNotification
        kind="info"
        title="No active test"
        subtitle="Select athletes in the roster, then start the test. The clock follows the protocol audio."
      />
    </div>
    <div class="button-row section-gap">
      <Button kind="secondary" on:click={() => activeTab.set('setup')}>Open roster</Button>
      <Button
        disabled={$selectedAthletes.length === 0}
        on:click={() => void startTest()}
      >
        Start test ({$selectedAthletes.length})
      </Button>
    </div>
  {/if}

  <div class="athlete-live-grid section-gap">
    {#each list as athlete (athlete.id)}
      <AthleteCard {athlete} />
    {/each}
  </div>

  {#if $testState === 'running' || $testState === 'paused'}
    <div class="button-row">
      {#if $undoDescription}
        <Button kind="tertiary" on:click={undoLastAction}>Undo</Button>
      {/if}
      {#if $testState === 'running'}
        <Button kind="secondary" on:click={pauseTest}>Pause</Button>
      {:else}
        <Button on:click={() => void resumeTest()}>Resume</Button>
      {/if}
      <Button kind="danger" on:click={stopAndFinishTest}>Finish test</Button>
    </div>
  {:else if $testState === 'completed'}
    <div class="button-row">
      <Button on:click={() => activeTab.set('leaderboard')}>View results</Button>
    </div>
  {/if}
</section>
