<script lang="ts">
  import { Button, ContentSwitcher, InlineNotification, Switch, Tag, Tile } from 'carbon-components-svelte';
  import { onDestroy, onMount } from 'svelte';
  import {
    getSyncStatus,
    isSyncHostCapable,
    startHostSyncServer,
    stopHostSyncServer
  } from '../services/syncService.ts';
  import {
    connectRemote,
    disconnectRemote,
    getFoundTablets,
    isRemoteCapable,
    popRemoteResults,
    sendRemoteAction,
    startTabletDiscovery,
    stopTabletDiscovery,
    type CommandResult,
    type FoundTablet,
    type RemoteSnapshot
  } from '../services/remoteClient.ts';

  let modeIndex = $state(0); // 0 = Host (tablet), 1 = Join (phone)

  // ---- host ----
  let hosting = $state(false);
  let phoneCount = $state(0);
  let hostError = $state<string | null>(null);
  let statusTimer: number | null = null;

  // ---- join ----
  let tablets: FoundTablet[] = $state([]);
  let connectingId = $state<string | null>(null);
  let connectedName = $state<string | null>(null);
  let snapshot: RemoteSnapshot | null = $state(null);
  let joinError = $state<string | null>(null);
  let commandFeedback = $state<string | null>(null);
  let actingId = $state<string | null>(null);
  let discoveryTimer: number | null = null;
  let resultsTimer: number | null = null;

  function pollCommandResults() {
    const results = popRemoteResults();
    for (const res of results) {
      if (res.accepted) {
        commandFeedback = `Command applied by ${connectedName ?? 'tablet'}.`;
      } else {
        commandFeedback = `Tablet rejected command: ${res.reason.replaceAll('_', ' ')}.`;
      }
    }
  }

  function refreshPhoneCount() {
    if (hosting) phoneCount = getSyncStatus().connectedPhones;
  }

  async function startHosting() {
    hostError = null;
    try {
      await startHostSyncServer();
      hosting = true;
      refreshPhoneCount();
      statusTimer = window.setInterval(refreshPhoneCount, 2000);
    } catch (err) {
      hostError = String(err instanceof Error ? err.message : err);
      hosting = false;
    }
  }

  async function stopHosting() {
    if (statusTimer !== null) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
    await stopHostSyncServer();
    hosting = false;
    phoneCount = 0;
  }

  function refreshTablets() {
    tablets = getFoundTablets();
  }

  function beginDiscovery() {
    try {
      startTabletDiscovery();
      refreshTablets();
      discoveryTimer = window.setInterval(refreshTablets, 2000);
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    }
  }

  function endDiscovery() {
    if (discoveryTimer !== null) {
      clearInterval(discoveryTimer);
      discoveryTimer = null;
    }
    stopTabletDiscovery();
  }

  async function connect(tablet: FoundTablet) {
    joinError = null;
    commandFeedback = null;
    connectingId = tablet.id;
    try {
      endDiscovery();
      await connectRemote(tablet.id, (snap) => {
        snapshot = snap;
      });
      connectedName = tablet.name;
      resultsTimer = window.setInterval(pollCommandResults, 1000);
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
      connectedName = null;
      snapshot = null;
      beginDiscovery();
    } finally {
      connectingId = null;
    }
  }

  function disconnect() {
    if (resultsTimer !== null) {
      clearInterval(resultsTimer);
      resultsTimer = null;
    }
    disconnectRemote();
    connectedName = null;
    snapshot = null;
    commandFeedback = null;
    beginDiscovery();
  }

  async function markMiss(id: string) {
    actingId = id;
    try {
      await sendRemoteAction({ action: 'mark_miss', athleteId: id });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    } finally {
      actingId = null;
    }
  }

  async function eliminate(id: string) {
    actingId = id;
    try {
      await sendRemoteAction({ action: 'eliminate', athleteId: id });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    } finally {
      actingId = null;
    }
  }

  async function sendStartTest() {
    try {
      await sendRemoteAction({ action: 'start_test' });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    }
  }

  async function sendPauseTest() {
    try {
      await sendRemoteAction({ action: 'pause_test' });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    }
  }

  async function sendResumeTest() {
    try {
      await sendRemoteAction({ action: 'resume_test' });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    }
  }

  async function sendResetTest() {
    try {
      await sendRemoteAction({ action: 'reset_test' });
    } catch (err) {
      joinError = String(err instanceof Error ? err.message : err);
    }
  }

  function onModeChange(index: number) {
    modeIndex = index;
    if (index === 1 && !connectedName) beginDiscovery();
    else endDiscovery();
  }

  onMount(() => {
    if (modeIndex === 1) beginDiscovery();
  });

  onDestroy(() => {
    if (statusTimer !== null) clearInterval(statusTimer);
    endDiscovery();
    disconnectRemote();
  });
</script>

<div class="screen">
  <div class="screen-title">
    <div>
      <span class="eyebrow">Multi-Device Synchronization</span>
      <h1>Tablet Server & Remote Phones</h1>
    </div>
    <div class="screen-actions">
      {#if hosting}
        <Tag type="green">Hosting{phoneCount > 0 ? ` · ${phoneCount} phone${phoneCount === 1 ? '' : 's'}` : ''}</Tag>
      {:else if connectedName}
        <Tag type="blue">Connected</Tag>
      {:else}
        <Tag type="gray">Standalone Mode</Tag>
      {/if}
    </div>
  </div>

  <div class="section-gap">
    <ContentSwitcher
      selectedIndex={modeIndex}
      on:change={(e) => onModeChange(e.detail as number)}
    >
      <Switch text="Host this tablet" />
      <Switch text="Join a tablet" />
    </ContentSwitcher>
  </div>

  {#if modeIndex === 0}
    <!-- ================= HOST ================= -->
    {#if hostError}
      <div class="section-gap">
        <InlineNotification kind="error" title="Server Error" subtitle={hostError} />
      </div>
    {/if}
    {#if !isSyncHostCapable()}
      <div class="section-gap">
        <InlineNotification
          kind="info"
          title="Native app required"
          subtitle="Hosting runs in the Android app. You are viewing the web preview, which is standalone-only."
        />
      </div>
    {/if}

    <div class="panel section-gap hero-panel">
      <div>
        <h2>One-tap hosting</h2>
        <p>
          Nearby Connections works over Bluetooth and Wi-Fi — no hotspot, no IP addresses.
          Assistant coaches open this app on their phones and press Connect.
        </p>
      </div>
      <div>
        {#if hosting}
          <Button kind="danger" on:click={stopHosting}>Stop hosting</Button>
        {:else}
          <Button kind="primary" disabled={!isSyncHostCapable()} on:click={startHosting}>Start hosting</Button>
        {/if}
      </div>
    </div>

    {#if hosting}
      <div class="section-gap">
        <Tile>
          <h3>Waiting for phones…</h3>
          <p class="setting-hint">
            {phoneCount === 0
              ? 'On each phone open Sync → Join a tablet and tap this tablet.'
              : `${phoneCount} phone${phoneCount === 1 ? '' : 's'} connected and receiving live updates.`}
          </p>
        </Tile>
      </div>
    {/if}
  {:else}
    <!-- ================= JOIN ================= -->
    {#if joinError}
      <div class="section-gap">
        <InlineNotification kind="error" title="Connection Error" subtitle={joinError} />
      </div>
    {/if}
    {#if !isRemoteCapable()}
      <div class="section-gap">
        <InlineNotification
          kind="info"
          title="Native app required"
          subtitle="Joining runs in the Android app. You are viewing the web preview, which is standalone-only."
        />
      </div>
    {/if}

    {#if !connectedName}
      <div class="panel section-gap">
        <h2>Nearby tablets</h2>
        <p class="setting-hint">Make sure Bluetooth and location are on, then tap your tablet below.</p>
      </div>
      <div class="settings-list">
        {#each tablets as tablet (tablet.id)}
          <div class="setting-row">
            <div>
              <strong>{tablet.name}</strong>
              <small>Tap to connect</small>
            </div>
            <Button
              size="small"
              kind="primary"
              disabled={connectingId !== null}
              on:click={() => connect(tablet)}
            >{connectingId === tablet.id ? 'Connecting…' : 'Connect'}</Button>
          </div>
        {:else}
          <div class="setting-row"><div><strong>Searching…</strong><small>Start hosting on the tablet first.</small></div></div>
        {/each}
      </div>
      <div class="section-gap">
        <Button size="small" kind="ghost" on:click={refreshTablets}>Refresh</Button>
      </div>
    {:else}
      {#if commandFeedback}
        <div class="section-gap">
          <InlineNotification kind="info" title="Remote Control" subtitle={commandFeedback} />
        </div>
      {/if}

      <div class="panel section-gap hero-panel">
        <div>
          <h2>Level {snapshot?.level ?? '–'} · Shuttle {snapshot?.shuttle ?? '–'}</h2>
          <p>{snapshot?.distance ?? 0} m · {connectedName}</p>
        </div>
        <div class="screen-actions">
          <Tag type={snapshot?.status === 'running' ? 'green' : 'gray'}>{snapshot?.status ?? '…'}</Tag>
          <Button size="small" kind="danger-ghost" on:click={disconnect}>Disconnect</Button>
        </div>
      </div>

      <!-- Remote Test Control Toolbar -->
      <div class="panel section-gap" style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-start; flex-wrap: wrap;">
        {#if snapshot?.status === 'idle'}
          <Button size="small" kind="primary" on:click={sendStartTest}>Start Test</Button>
        {:else if snapshot?.status === 'running'}
          <Button size="small" kind="secondary" on:click={sendPauseTest}>Pause Test</Button>
        {:else if snapshot?.status === 'paused'}
          <Button size="small" kind="primary" on:click={sendResumeTest}>Resume Test</Button>
          <Button size="small" kind="danger-tertiary" on:click={sendResetTest}>Reset Test</Button>
        {:else}
          <Button size="small" kind="tertiary" on:click={sendResetTest}>Reset Test</Button>
        {/if}
      </div>

      <div class="settings-list">
        {#each snapshot?.athletes ?? [] as athlete (athlete.id)}
          <div class="setting-row">
            <div>
              <strong>{athlete.name}</strong>
              <small>{athlete.status}{athlete.consecutiveMisses > 0 ? ` · ${athlete.consecutiveMisses} miss` : ''}</small>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <Button
                size="small"
                kind="secondary"
                disabled={athlete.status === 'eliminated' || actingId === athlete.id}
                on:click={() => markMiss(athlete.id)}
              >Miss</Button>
              <Button
                size="small"
                kind="danger"
                disabled={athlete.status === 'eliminated' || actingId === athlete.id}
                on:click={() => eliminate(athlete.id)}
              >Out</Button>
            </div>
          </div>
        {:else}
          <div class="setting-row"><div><strong>No athletes yet</strong><small>Start a test on the tablet first.</small></div></div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
