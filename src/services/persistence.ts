import type { Athlete, TestSession } from '../domain/models.ts';

export interface PersistedState {
  sessions: TestSession[];
  roster: Athlete[];
  volumeBoost: number;
  boostEnabled: boolean;
}

const fallbackKey = 'yoyo-tauri-state-v1';
const defaults: PersistedState = {
  sessions: [],
  roster: [],
  volumeBoost: 1,
  boostEnabled: true
};

function isAndroidBridge(): boolean {
  return typeof window !== 'undefined' && 'Android' in window && Boolean((window as any).Android);
}

function getAndroidBridge(): any {
  return (window as any).Android;
}

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    if (isAndroidBridge()) {
      const bridge = getAndroidBridge();
      const raw = bridge.loadData(fallbackKey);
      if (raw) {
        return { ...defaults, ...JSON.parse(raw) };
      }
    }

    const raw = localStorage.getItem(fallbackKey);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (error) {
    console.warn('Could not load persisted state', error);
    return defaults;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    const serialized = JSON.stringify(state);
    if (isAndroidBridge()) {
      getAndroidBridge().saveData(fallbackKey, serialized);
    }
    localStorage.setItem(fallbackKey, serialized);
  } catch (error) {
    console.warn('Could not persist app state', error);
  }
}
