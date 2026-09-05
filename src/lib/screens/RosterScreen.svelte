<script lang="ts">
  import { Tag } from 'carbon-components-svelte';
  import ScreenTitle from '$lib/components/ScreenTitle.svelte';
  import RosterSelector from '$lib/components/RosterSelector.svelte';
  import { athletes, selectedAthletes } from '$lib/state/testStore.ts';
</script>

<section class="screen">
  <ScreenTitle
    eyebrow="Setup"
    title="Athlete roster"
    description="Choose the athletes participating in this test."
  >
    {#snippet actions()}
      <Tag type="blue">{$selectedAthletes.length}/{$athletes.length} selected</Tag>
    {/snippet}
  </ScreenTitle>

  <RosterSelector showBack />
</section>
