<script lang="ts">
  import { Button, DataTable, InlineNotification, Tile } from 'carbon-components-svelte';
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import { getProtocol } from '../../domain/protocol.ts';
  import { activeTab, selectedTestType } from '../state/app.ts';
  import {
    athletes,
    resetTest,
    saveSession,
    sessionSavedId,
    testState
  } from '../state/testStore.ts';
  import { makeCsv } from '../../services/export.ts';

  const protocol = $derived(getProtocol($selectedTestType));
  const results = $derived(
    $athletes
      .filter((a) => a.isSelected && a.finalDistanceMeters !== undefined)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  );
  const headers = [
    { key: 'rank', value: 'Rank' },
    { key: 'name', value: 'Athlete' },
    { key: 'distance', value: 'Distance (m)' },
    { key: 'level', value: 'Level' },
    { key: 'vo2', value: 'VO₂max' }
  ] as const;
  const rows = $derived(
    results.map((a) => ({
      id: a.id,
      rank: String(a.rank ?? '–'),
      name: a.name,
      distance: (a.finalDistanceMeters ?? 0).toLocaleString(),
      level: a.finalLevel ?? '–',
      vo2: (a.vo2Max ?? 0).toFixed(1)
    }))
  );

  let copied = $state(false);

  async function copyCsv() {
    await navigator.clipboard?.writeText(makeCsv(results));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<section class="screen">
  <ScreenTitle
    eyebrow="Results"
    title={`${protocol.displayName} leaderboard`}
    description={$testState === 'completed'
      ? 'Final session results.'
      : 'Updates as athletes finish.'}
  />

  {#if results.length === 0}
    <Tile class="section-gap">
      <div class="empty-copy">No completed athletes yet.</div>
    </Tile>
  {:else}
    <div class="section-gap">
      <DataTable {headers} {rows} />
    </div>
  {/if}

  {#if copied}
    <div class="section-gap">
      <InlineNotification kind="success" title="Copied" subtitle="Results CSV is on the clipboard." />
    </div>
  {/if}

  {#if $testState === 'completed'}
    <div class="button-row">
      <Button disabled={!!$sessionSavedId} on:click={() => void saveSession()}>
        {$sessionSavedId ? 'Saved to history' : 'Save to history'}
      </Button>
      <Button kind="secondary" on:click={() => void copyCsv()}>Copy CSV</Button>
      <Button kind="secondary" on:click={() => activeTab.set('history')}>View history</Button>
      <Button kind="danger-tertiary" on:click={resetTest}>New test</Button>
    </div>
  {:else}
    <div class="button-row">
      <Button kind="secondary" on:click={() => activeTab.set('live')}>Back to live test</Button>
    </div>
  {/if}
</section>
