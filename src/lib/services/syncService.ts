import { get } from 'svelte/store';
import {
  athletes,
  eliminateAthlete,
  markAthleteMiss,
  runtime,
  testState
} from '../state/testStore.ts';

export interface SyncStatus {
  isServerRunning: boolean;
  serverUrl: string | null;
  localIps: string[];
}

let syncTimer: number | null = null;
let serverRunning = false;
let currentServerUrl: string | null = null;

function isAndroidBridge(): boolean {
  return typeof window !== 'undefined' && 'Android' in window && Boolean((window as any).Android);
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getHostLocalIps(): Promise<string[]> {
  try {
    if (isAndroidBridge()) {
      const raw = (window as any).Android.getLocalIps();
      if (raw) {
        return JSON.parse(raw);
      }
    }

    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string[]>('get_local_ips');
    }

    return ['127.0.0.1'];
  } catch (err) {
    console.warn('Failed to fetch local IPs:', err);
    return ['127.0.0.1'];
  }
}

export async function startHostSyncServer(port = 8080): Promise<string> {
  try {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      const url = await invoke<string>('start_sync_server', { port });
      serverRunning = true;
      currentServerUrl = url;
      startSyncLoop();
      return url;
    }

    const ips = await getHostLocalIps();
    const primaryIp = ips[0] ?? '127.0.0.1';
    const url = `http://${primaryIp}:${port}`;
    serverRunning = true;
    currentServerUrl = url;
    startSyncLoop();
    return url;
  } catch (err) {
    console.error('Failed to start host sync server:', err);
    throw err;
  }
}

export async function stopHostSyncServer(): Promise<void> {
  try {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('stop_sync_server');
    }
    serverRunning = false;
    currentServerUrl = null;
    if (syncTimer !== null) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  } catch (err) {
    console.error('Failed to stop host sync server:', err);
  }
}

function startSyncLoop() {
  if (syncTimer !== null) return;

  syncTimer = window.setInterval(async () => {
    if (!serverRunning) return;

    const rt = get(runtime);
    const payload = {
      status: get(testState),
      level: rt.shuttle?.levelDisplay ?? '1',
      shuttle: rt.shuttle?.shuttleNumber ?? 1,
      distance: rt.currentDistanceMeters ?? 0,
      athletes: get(athletes)
    };

    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('broadcast_test_state', {
          stateJson: JSON.stringify(payload)
        });

        const actions = await invoke<string[]>('pop_remote_actions');
        for (const actionRaw of actions) {
          try {
            const parsed = JSON.parse(actionRaw);
            if (parsed.action === 'mark_miss' && parsed.athleteId) {
              markAthleteMiss(parsed.athleteId);
            } else if (parsed.action === 'eliminate' && parsed.athleteId) {
              eliminateAthlete(parsed.athleteId);
            }
          } catch {
            // invalid payload ignored
          }
        }
      }
    } catch (e) {
      console.warn('Sync loop error:', e);
    }
  }, 250);
}
