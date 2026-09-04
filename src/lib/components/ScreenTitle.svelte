<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: Snippet;
  }

  let { eyebrow, title, description, actions }: Props = $props();
</script>

<div class="screen-title">
  <div>
    {#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
    <h1>{title}</h1>
    {#if description}<p>{description}</p>{/if}
  </div>
  {#if actions}<div class="screen-actions">{@render actions()}</div>{/if}
</div>
