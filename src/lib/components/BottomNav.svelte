<script lang="ts">
  import type { AppTab } from '../../domain/models.ts';
  import { navItems } from '../state/app.ts';

  interface Props {
    active: AppTab;
    onSelect: (tab: AppTab) => void;
  }

  let { active, onSelect }: Props = $props();
  const mobileItems = navItems.filter((item) => ['startup', 'setup', 'live', 'leaderboard', 'history'].includes(item.id));
</script>

<nav class="bottom-nav" aria-label="Mobile navigation">
  {#each mobileItems as item}
    <button class:active={active === item.id} onclick={() => onSelect(item.id)}>{item.short}</button>
  {/each}
</nav>
