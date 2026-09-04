<script lang="ts">
  import { Button, Tag, Tile } from 'carbon-components-svelte';
  import AthleteAvatar from './AthleteAvatar.svelte';
  import type { Athlete } from '../../domain/models.ts';
  import {
    eliminateAthlete,
    markAthleteMiss,
    testState
  } from '../state/testStore.ts';

  interface Props {
    athlete: Athlete;
  }

  let { athlete }: Props = $props();
  const live = $derived($testState === 'running');

  const statusLine = $derived(
    athlete.status === 'warned'
      ? `Warning · Lvl ${athlete.warningLevel ?? '–'} @ ${(athlete.warningDistanceMeters ?? 0).toLocaleString()} m`
      : athlete.status === 'eliminated'
        ? `${(athlete.finalDistanceMeters ?? 0).toLocaleString()} m · Lvl ${athlete.finalLevel ?? '–'}`
        : 'Running · no warnings'
  );
</script>

<div class="athlete-live status-{athlete.status}">
  <Tile>
    <div class="athlete-live-top">
      <AthleteAvatar name={athlete.name} size="md" />
      <div class="grow">
        <strong>{athlete.name}</strong>
        <small>{statusLine}</small>
      </div>
      {#if athlete.status === 'running'}
        <Tag type="green">Running</Tag>
      {:else if athlete.status === 'warned'}
        <Tag type="red">Warning</Tag>
      {:else}
        <Tag type="gray">Finished{athlete.rank ? ` #${athlete.rank}` : ''}</Tag>
      {/if}
    </div>
    {#if athlete.status === 'eliminated'}
      <p class="final-line">VO₂max <b>{(athlete.vo2Max ?? 0).toFixed(1)}</b></p>
    {:else}
      <div class="button-row athlete-actions">
        <Button
          size="small"
          kind="secondary"
          disabled={!live}
          on:click={() => markAthleteMiss(athlete.id)}
        >
          {athlete.status === 'warned' ? 'Miss again' : 'Miss'}
        </Button>
        <Button
          size="small"
          kind="danger"
          disabled={!live}
          on:click={() => eliminateAthlete(athlete.id)}
        >
          Out
        </Button>
      </div>
    {/if}
  </Tile>
</div>
