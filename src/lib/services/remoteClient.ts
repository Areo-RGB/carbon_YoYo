import type { Athlete, TestState } from '../../domain/models.ts';

// Phone side of the Nearby Connections sync: discover hosting tablets,
// connect with one tap, receive live state and send miss/eliminate actions.

export interface RemoteSnapshot {
  status: TestState;
  level: string;
  shuttle: number;
  distance: number;
  athletes: Athlete[];
}

export interface FoundTablet {
  id: string;
  name: string;
}

export type RemoteAction =
  | { action: 'mark_miss'; athleteId: string; requestId?: string }
  | { action: 'eliminate'; athleteId: string; requestId?: string }
  | { action: 'start_test'; requestId?: string }
  | { action: 'pause_test'; requestId?: string }
  | { action: 'resume_test'; requestId?: string }
  | { action: 'reset_test'; requestId?: string };

export interface CommandResult {
  requestId: string;
  accepted: boolean;
  reason: string;
}

interface AndroidBridge {
  startTabletDiscovery(): string;
  stopTabletDiscovery(): void;
  getFoundTablets(): string;
  connectTablet(endpointId: string): string;
  getRemoteState(): string;
  sendRemoteAction(actionJson: string): void;
  sendRemoteCommand?(commandJson: string): void;
  popRemoteResults?(): string;
  disconnectTablet(): void;
}

const POLL_MS = 1000;

let pollTimer: number | null = null;

function getAndroidBridge(): AndroidBridge {
  const bridge = (window as any)?.Android as AndroidBridge | undefined;
  if (!bridge?.startTabletDiscovery) {
    throw new Error('Joining requires the native Android app (update to the latest build).');
  }
  return bridge;
}

export function isRemoteCapable(): boolean {
  try {
    getAndroidBridge();
    return true;
  } catch {
    return false;
  }
}

export function startTabletDiscovery(): void {
  getAndroidBridge().startTabletDiscovery();
}

export function stopTabletDiscovery(): void {
  try {
    ((window as any)?.Android as AndroidBridge | undefined)?.stopTabletDiscovery?.();
  } catch {
    // best-effort
  }
}

export function getFoundTablets(): FoundTablet[] {
  try {
    const raw = getAndroidBridge().getFoundTablets();
    if (!raw) return [];
    return JSON.parse(raw) as FoundTablet[];
  } catch {
    return [];
  }
}

export async function connectRemote(endpointId: string, onSnapshot: (snap: RemoteSnapshot) => void): Promise<void> {
  disconnectRemote();
  const bridge = getAndroidBridge();
  bridge.connectTablet(endpointId);
  onSnapshot(parseSnapshot(bridge.getRemoteState()));
  pollTimer = window.setInterval(() => {
    try {
      onSnapshot(parseSnapshot(getAndroidBridge().getRemoteState()));
    } catch (err) {
      console.warn('Remote sync poll failed:', err);
    }
  }, POLL_MS);
}

export function disconnectRemote(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  try {
    ((window as any)?.Android as AndroidBridge | undefined)?.disconnectTablet?.();
  } catch {
    // best-effort
  }
}

function parseSnapshot(raw: string): RemoteSnapshot {
  const data = raw ? JSON.parse(raw) : {};
  return {
    status: data.status ?? 'idle',
    level: String(data.level ?? '–'),
    shuttle: Number(data.shuttle ?? 0),
    distance: Number(data.distance ?? 0),
    athletes: Array.isArray(data.athletes) ? data.athletes : []
  };
}

export async function sendRemoteAction(action: RemoteAction): Promise<string> {
  const requestId = action.requestId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = { ...action, requestId };
  const bridge = getAndroidBridge();
  if (bridge.sendRemoteCommand) {
    bridge.sendRemoteCommand(JSON.stringify(payload));
  } else {
    bridge.sendRemoteAction(JSON.stringify(payload));
  }
  return requestId;
}

export function popRemoteResults(): CommandResult[] {
  try {
    const raw = getAndroidBridge().popRemoteResults?.();
    if (!raw) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      return {
        requestId: String(parsed.requestId ?? ''),
        accepted: Boolean(parsed.accepted),
        reason: String(parsed.reason ?? 'unknown')
      };
    });
  } catch {
    return [];
  }
}
