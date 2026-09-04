<script lang="ts">
  import type { AppTab } from '../../domain/models.ts';
  import { navItems } from '../state/app.ts';

  interface Props {
    active: AppTab;
    onSelect: (tab: AppTab) => void;
  }

  let { active, onSelect }: Props = $props();
</script>

<nav class="side-nav" aria-label="Main navigation">
  {#each navItems as item}
    <button class:active={active === item.id} onclick={() => onSelect(item.id)}>
      <span class="nav-dot"></span>
      <span>{item.label}</span>
    </button>
  {/each}
</nav>
