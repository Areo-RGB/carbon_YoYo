<script lang="ts">
  import { ContentSwitcher, Switch } from 'carbon-components-svelte';
  import type { TestType } from '../../domain/protocol.ts';

  interface Props {
    testType: TestType;
    onTestTypeChange: (type: TestType) => void;
  }

  let { testType, onTestTypeChange }: Props = $props();

  const selectedIndex = $derived(testType === 'yoyoIR1' ? 0 : 1);
</script>

<div class="carbon-app-header">
  <div class="carbon-brand">
    <strong>Yo-Yo Fitness Tracker</strong>
    <span>Tauri + Svelte + Carbon</span>
  </div>

  <ContentSwitcher
    {selectedIndex}
    on:change={(e) => {
      const index = e.detail as number;
      onTestTypeChange(index === 0 ? 'yoyoIR1' : 'beepTest');
    }}
  >
    <Switch text="Yo-Yo IR1" />
    <Switch text="Beep Test" />
  </ContentSwitcher>
</div>

<style>
  .carbon-app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .carbon-brand strong {
    display: block;
    font-size: 1.1rem;
  }
  .carbon-brand span {
    font-size: 0.8rem;
    opacity: 0.65;
  }
</style>
