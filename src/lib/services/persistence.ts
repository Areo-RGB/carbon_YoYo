import type { Athlete, TestSession } from '$lib/domain/models.ts';

export interface PersistedState {
  sessions: TestSession[];
  roster: Athlete[];
  volumeBoost: number;
  boostEnabled: boolean;
}

const storageKey = 'yoyo-web-state-v1';
const defaults: PersistedState = {
  sessions: [],
  roster: [],
  volumeBoost: 1,
  boostEnabled: true
};

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (error) {
    console.warn('Could not load persisted state', error);
    return defaults;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not persist app state', error);
  }
}
