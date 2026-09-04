<script lang="ts">
  import { Button, TextInput, Tile } from 'carbon-components-svelte';
  import AthleteAvatar from './AthleteAvatar.svelte';
  import { getAthleteFullName } from '../../domain/avatar.ts';
  import { getProtocol } from '../../domain/protocol.ts';
  import { activeTab, selectedTestType } from '../state/app.ts';
  import {
    addAthlete,
    athletes,
    deselectAllAthletes,
    selectAllAthletes,
    selectedAthletes,
    startTest,
    testState,
    toggleAthleteSelected
  } from '../state/testStore.ts';

  interface Props {
    /** Show the "Back" button returning to the dashboard (roster tab only). */
    showBack?: boolean;
    /** Show the add-athlete tile (hidden on the home tab). */
    showAdd?: boolean;
  }

  let { showBack = false, showAdd = true }: Props = $props();

  let newName = $state('');
  const protocol = $derived(getProtocol($selectedTestType));
  const editingLocked = $derived($testState !== 'idle');

  function submit() {
    addAthlete(newName);
    newName = '';
  }
</script>

<Tile class="section-gap">
  <div class="button-row">
    <Button size="small" kind="ghost" disabled={editingLocked} on:click={selectAllAthletes}>
      Select all
    </Button>
      <Button size="small" kind="ghost" disabled={editingLocked} on:click={deselectAllAthletes}>
        Clear
      </Button>
    </div>
</Tile>

<div class="roster-list section-gap">
  {#each $athletes as athlete (athlete.id)}
    <Tile class="roster-row{athlete.isSelected ? ' selected' : ''}" light={athlete.isSelected}>
      <div
        class="roster-athlete-info grow"
        role="button"
        tabindex="0"
        aria-pressed={athlete.isSelected}
        aria-disabled={editingLocked}
        onclick={() => !editingLocked && toggleAthleteSelected(athlete.id)}
        onkeydown={(e) => {
          if (!editingLocked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleAthleteSelected(athlete.id);
          }
        }}
      >
        <AthleteAvatar name={athlete.name} size="md" />
        <div class="athlete-meta">
          <strong class="athlete-name">{athlete.name}</strong>
          {#if getAthleteFullName(athlete.name) && getAthleteFullName(athlete.name) !== athlete.name}
            <small class="athlete-fullname">{getAthleteFullName(athlete.name)}</small>
          {/if}
        </div>
      </div>
    </Tile>
  {/each}
</div>

{#if showAdd}
  <Tile class="section-gap">
    <div class="add-row">
      <TextInput
        labelText="Add athlete"
        hideLabel
        placeholder="Athlete name (max 40 characters)"
        maxlength={40}
        bind:value={newName}
        on:keydown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <Button kind="secondary" disabled={editingLocked || !newName.trim()} on:click={submit}>
        Add athlete
      </Button>
    </div>
    <p class="protocol-note">
      <strong>Protocol:</strong> {protocol.badges.join(' · ')}. The test clock is
      synchronized to the protocol audio.
    </p>
  </Tile>
{/if}

<div class="start-row">
  {#if showBack}
    <Button kind="secondary" size="lg" on:click={() => activeTab.set('startup')}>
      Back
    </Button>
  {/if}
  <Button
    size="lg"
    disabled={$selectedAthletes.length === 0}
    on:click={() => void startTest()}
  >
    Start [{$selectedAthletes.length}]
  </Button>
</div>
