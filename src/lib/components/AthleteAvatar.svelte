<script lang="ts">
  import { UserAvatar } from 'carbon-components-svelte';
  import { getAthleteAvatar, getAthleteFullName } from '../../domain/avatar.ts';

  interface Props {
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    backgroundColor?: 'neutral' | 'blue' | 'cool-gray' | 'gray';
    class?: string;
  }

  let {
    name,
    size = 'lg',
    backgroundColor = 'neutral',
    class: className = ''
  }: Props = $props();

  const avatarUrl = $derived(getAthleteAvatar(name) ?? undefined);
  const fullName = $derived(getAthleteFullName(name) ?? name);
  const carbonBg = $derived(
    backgroundColor === 'neutral' ? 'cool-gray' : backgroundColor
  );
</script>

<div
  class="athlete-avatar-wrapper bg-{backgroundColor} {className}"
  title={name}
>
  <UserAvatar
    image={avatarUrl}
    imageDescription={name}
    name={fullName}
    {size}
    backgroundColor={carbonBg}
  />
</div>

<style>
  .athlete-avatar-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    flex-shrink: 0;
  }

  .athlete-avatar-wrapper :global(.bx--user-avatar) {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--cds-border-subtle, #e0e0e0);
    transition: background-color 0.15s ease;
  }

  /* Unified light neutral studio background */
  .athlete-avatar-wrapper.bg-neutral :global(.bx--user-avatar) {
    background-color: var(--cds-layer-02, #e8e8e8) !important;
    color: var(--cds-text-primary, #161616) !important;
  }

  .athlete-avatar-wrapper.bg-neutral :global(.bx--user-avatar .bx--user-avatar__text) {
    color: var(--cds-text-primary, #161616) !important;
    font-weight: 700;
  }

  .athlete-avatar-wrapper :global(.bx--user-avatar img) {
    object-position: center 20%;
  }
</style>
