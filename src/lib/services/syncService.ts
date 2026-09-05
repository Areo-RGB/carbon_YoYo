import { get } from 'svelte/store';
import {
  athletes,
  eliminateAthlete,
  markAthleteMiss,
  pauseTest,
  resetTest,
  resumeTest,
  runtime,
  startTest,
  testState
} from '../state/testStore.ts';

export interface SyncStatus {
  isServerRunning: boolean;
  connectedPhones: number;
}

// Tablet hosting via Google Nearby Connections: phones discover this tablet,
// connect, receive live state and send back miss/eliminate actions.

interface AndroidBridge {
  startHosting(): string;
  stopHosting(): void;
  broadcastTestState(stateJson: string): void;
  broadcastCommandResult?(resultJson: string): void;
  popRemoteActions(): string;
  connectedPhoneCount(): number;
}

let syncTimer: number | null = null;
let hosting = false;

function getAndroidBridge(): AndroidBridge | null {
  if (typeof window !== 'undefined' && 'Android' in window && Boolean((window as any).Android)) {
    return (window as any).Android as AndroidBridge;
  }
  return null;
}

export function isSyncHostCapable(): boolean {
  return getAndroidBridge() !== null;
}

export function getSyncStatus(): SyncStatus {
  const bridge = getAndroidBridge();
  return {
    isServerRunning: hosting,
    connectedPhones: bridge && hosting ? bridge.connectedPhoneCount() : 0
  };
}

export async function startHostSyncServer(): Promise<void> {
  const bridge = getAndroidBridge();
  if (!bridge) {
    throw new Error('Hosting requires the native Android app (Android bridge not available).');
  }
  bridge.startHosting();
  hosting = true;
  startSyncLoop();
}

export async function stopHostSyncServer(): Promise<void> {
  try {
    getAndroidBridge()?.stopHosting();
  } finally {
    hosting = false;
    if (syncTimer !== null) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }
}

function startSyncLoop() {
  if (syncTimer !== null) return;

  syncTimer = window.setInterval(() => {
    if (!hosting) return;
    const bridge = getAndroidBridge();
    if (!bridge) return;

    const rt = get(runtime);
    const payload = {
      status: get(testState),
      level: rt.shuttle?.levelDisplay ?? '1',
      shuttle: rt.shuttle?.shuttleNumber ?? 1,
      distance: rt.currentDistanceMeters ?? 0,
      athletes: get(athletes)
    };

    try {
      bridge.broadcastTestState(JSON.stringify(payload));

      const raw = bridge.popRemoteActions();
      if (!raw) return;
      const actions: string[] = JSON.parse(raw);
      for (const actionRaw of actions) {
        try {
          const parsed = JSON.parse(typeof actionRaw === 'string' ? actionRaw : JSON.stringify(actionRaw));
          let accepted = false;
          let reason = 'invalid_action';
          const currentState = get(testState);

          switch (parsed.action) {
            case 'mark_miss':
              if (parsed.athleteId && currentState === 'running') {
                markAthleteMiss(parsed.athleteId);
                accepted = true;
                reason = 'applied';
              } else {
                reason = currentState !== 'running' ? 'invalid_test_state' : 'invalid_athlete';
              }
              break;
            case 'eliminate':
              if (parsed.athleteId && currentState === 'running') {
                eliminateAthlete(parsed.athleteId);
                accepted = true;
                reason = 'applied';
              } else {
                reason = currentState !== 'running' ? 'invalid_test_state' : 'invalid_athlete';
              }
              break;
            case 'start_test':
              if (currentState === 'idle') {
                void startTest();
                accepted = true;
                reason = 'applied';
              } else {
                reason = 'invalid_test_state';
              }
              break;
            case 'pause_test':
              if (currentState === 'running') {
                pauseTest();
                accepted = true;
                reason = 'applied';
              } else {
                reason = 'invalid_test_state';
              }
              break;
            case 'resume_test':
              if (currentState === 'paused') {
                void resumeTest();
                accepted = true;
                reason = 'applied';
              } else {
                reason = 'invalid_test_state';
              }
              break;
            case 'reset_test':
              resetTest();
              accepted = true;
              reason = 'applied';
              break;
          }

          if (parsed.requestId && bridge.broadcastCommandResult) {
            bridge.broadcastCommandResult(
              JSON.stringify({
                requestId: parsed.requestId,
                accepted,
                reason
              })
            );
          }
        } catch {
          // invalid payload ignored
        }
      }
    } catch (e) {
      console.warn('Sync loop error:', e);
    }
  }, 250);
}
