<script lang="ts">
  interface Props { label: string; value: string; detail?: string }
  let { label, value, detail }: Props = $props();
</script>
<div class="metric-card">
  <span>{label}</span>
  <strong>{value}</strong>
  {#if detail}<small>{detail}</small>{/if}
</div>
