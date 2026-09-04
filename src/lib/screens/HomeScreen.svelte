<script lang="ts">
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import RosterSelector from '../components/RosterSelector.svelte';
</script>

<section class="screen">
  <ScreenTitle
    eyebrow="Dashboard"
    title="Select athletes"
    description="Choose the athletes participating in this test, then start."
  />
  <RosterSelector showAdd={false} />
</section>
