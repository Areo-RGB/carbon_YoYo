<script lang="ts">
  import { Button, CodeSnippet, InlineNotification, Tag, Tile, Toggle } from 'carbon-components-svelte';
  import { onMount } from 'svelte';
  import {
    getHostLocalIps,
    startHostSyncServer,
    stopHostSyncServer
  } from '../services/syncService.ts';

  let isServerActive = $state(false);
  let serverUrl = $state<string | null>(null);
  let localIps = $state<string[]>([]);
  let port = $state(8080);
  let errorMessage = $state<string | null>(null);

  async function loadIps() {
    localIps = await getHostLocalIps();
  }

  async function handleToggle(event: any) {
    const shouldRun = Boolean(event?.detail?.toggled ?? event?.detail);
    errorMessage = null;

    if (shouldRun) {
      try {
        const url = await startHostSyncServer(port);
        serverUrl = url;
        isServerActive = true;
        await loadIps();
      } catch (err) {
        errorMessage = String(err);
        isServerActive = false;
        serverUrl = null;
      }
    } else {
      await stopHostSyncServer();
      isServerActive = false;
      serverUrl = null;
    }
  }

  onMount(() => {
    loadIps();
  });
</script>

<div class="screen">
  <div class="screen-title">
    <div>
      <span class="eyebrow">Multi-Device Synchronization</span>
      <h1>Tablet Server & Remote Phones</h1>
    </div>
    <div class="screen-actions">
      {#if isServerActive}
        <Tag type="green">Server Active</Tag>
      {:else}
        <Tag type="gray">Standalone Mode</Tag>
      {/if}
    </div>
  </div>

  {#if errorMessage}
    <div class="section-gap">
      <InlineNotification
        kind="error"
        title="Server Error"
        subtitle={errorMessage}
      />
    </div>
  {/if}

  <div class="panel section-gap hero-panel">
    <div>
      <h2>Tablet Wi-Fi Hotspot Host</h2>
      <p>
        Run a local sync server on this tablet. Other coaches and devices connected to your tablet’s Wi-Fi hotspot can view live shuttle progress and mark warnings/outs remotely.
      </p>
    </div>
    <div>
      <Toggle
        labelText="Sync Server"
        labelA="Server Stopped"
        labelB="Server Active"
        toggled={isServerActive}
        on:toggle={handleToggle}
      />
    </div>
  </div>

  {#if isServerActive}
    <div class="section-gap">
      <Tile>
        <h3>Connected Devices URL</h3>
        <p class="setting-hint">
          Open this URL in any web browser on connected phones (no app installation required!):
        </p>
        <div style="margin-top: 0.75rem;">
          {#each localIps as ip}
            <div style="margin-bottom: 0.5rem;">
              <CodeSnippet type="single" value={`http://${ip}:${port}`} />
            </div>
          {/each}
        </div>
      </Tile>
    </div>
  {/if}

  <div class="settings-list">
    <div class="setting-row vertical">
      <strong>How to setup Tablet Hotspot:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.2rem; line-height: 1.6;">
        <li>Go to Tablet <b>Settings &gt; Network / Connections &gt; Portable Hotspot</b> and turn it ON.</li>
        <li>Have assistant coaches connect their phones to the Tablet’s Wi-Fi network.</li>
        <li>Turn ON the <b>Tablet Sync Server</b> toggle above.</li>
        <li>On assistant phones, open Chrome or Safari and enter the URL shown above (e.g. <code>http://192.168.43.1:8080</code>).</li>
      </ol>
    </div>

    <div class="setting-row">
      <div>
        <strong>Local Network IP Addresses</strong>
        <small>{localIps.join(', ') || 'Scanning interfaces...'}</small>
      </div>
      <Button size="small" kind="ghost" on:click={loadIps}>Refresh IPs</Button>
    </div>
  </div>
</div>
