import { derived, get, writable } from 'svelte/store';
import {
  createDefaultRoster,
  type Athlete,
  type TestSession,
  type TestState
} from '../../domain/models.ts';
import { getProtocol, type TestType } from '../../domain/protocol.ts';
import { deriveRuntime, type RuntimeSnapshot } from '../../domain/runtime.ts';
import { rankAthletes } from '../../domain/results.ts';
import {
  applyMiss,
  clearExpiredBeepWarning,
  finalizeAthlete
} from '../../domain/athleteRules.ts';
import { ProtocolAudioClock } from '../../services/audioClock.ts';
import {
  loadPersistedState,
  savePersistedState
} from '../../services/persistence.ts';
import { activeTab, selectedTestType } from './app.ts';

interface UndoEntry {
  athlete: Athlete;
  description: string;
}

function blankRuntime(type: TestType): RuntimeSnapshot {
  return deriveRuntime(getProtocol(type), 0);
}

function resetAthleteForTest(a: Athlete): Athlete {
  return {
    ...a,
    status: 'running',
    consecutiveMisses: 0,
    lastMissShuttle: undefined,
    warningDistanceMeters: undefined,
    warningLevel: undefined,
    warningTimestampMs: undefined,
    finalDistanceMeters: undefined,
    finalLevel: undefined,
    finishTimestampMs: undefined,
    rank: undefined,
    vo2Max: undefined
  };
}

export const athletes = writable<Athlete[]>(createDefaultRoster());
export const testState = writable<TestState>('idle');
export const elapsedMs = writable(0);
export const runtime = writable<RuntimeSnapshot>(blankRuntime('yoyoIR1'));
export const soundEnabled = writable(true);
export const volumeBoost = writable(1);
export const boostEnabled = writable(true);
export const sessions = writable<TestSession[]>([]);
export const sessionSavedId = writable<string | undefined>(undefined);

const undoStack = writable<UndoEntry[]>([]);
export const undoDescription = derived(undoStack, ($stack) => $stack.at(-1)?.description);
export const selectedAthletes = derived(athletes, ($athletes) =>
  $athletes.filter((a) => a.isSelected)
);

const audioClock = new ProtocolAudioClock();
let rafId = 0;
let lastShuttle = 1;
let hydrated = false;

function protocolNow() {
  return getProtocol(get(selectedTestType));
}

function completeNaturally(atRuntime: RuntimeSnapshot) {
  const type = get(selectedTestType);
  athletes.update((current) =>
    rankAthletes(
      current.map((athlete) =>
        athlete.isSelected && athlete.finalDistanceMeters === undefined
          ? finalizeAthlete(athlete, type, atRuntime)
          : athlete
      )
    )
  );
  testState.set('completed');
  elapsedMs.set(atRuntime.elapsedMs);
  audioClock.stop();
}

function tick() {
  const protocol = protocolNow();
  const type = get(selectedTestType);
  const nextElapsed = audioClock.elapsedMs();
  const nextRuntime = deriveRuntime(protocol, nextElapsed);
  elapsedMs.set(nextElapsed);
  runtime.set(nextRuntime);

  // Beep Test: a warning only stays live if the next shuttle was also missed.
  if (
    type === 'beepTest' &&
    nextRuntime.shuttle.shuttleNumber !== lastShuttle
  ) {
    lastShuttle = nextRuntime.shuttle.shuttleNumber;
    athletes.update((current) =>
      current.map((a) => clearExpiredBeepWarning(a, lastShuttle))
    );
  }

  if (nextRuntime.completed) {
    completeNaturally(nextRuntime);
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function beginTick() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function stopTick() {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function persist() {
  if (!hydrated) return;
  void savePersistedState({
    sessions: get(sessions),
    roster: get(athletes).map(resetAthleteForTest),
    volumeBoost: get(volumeBoost),
    boostEnabled: get(boostEnabled)
  });
}

async function hydrate() {
  const stored = await loadPersistedState();
  if (stored.roster.length) athletes.set(stored.roster.map(resetAthleteForTest));
  sessions.set(stored.sessions);
  volumeBoost.set(stored.volumeBoost);
  boostEnabled.set(stored.boostEnabled);
  audioClock.setBoost(stored.boostEnabled ? stored.volumeBoost : 1);
  hydrated = true;
}

void hydrate();

soundEnabled.subscribe((value) => audioClock.setSoundEnabled(value));
athletes.subscribe(() => persist());
sessions.subscribe(() => persist());
volumeBoost.subscribe((value) => {
  if (get(boostEnabled)) audioClock.setBoost(value);
  persist();
});
boostEnabled.subscribe((value) => {
  audioClock.setBoost(value ? get(volumeBoost) : 1);
  persist();
});

export function setSelectedTestType(type: TestType) {
  if (get(testState) !== 'idle') return;
  selectedTestType.set(type);
  runtime.set(blankRuntime(type));
  elapsedMs.set(0);
}

export function toggleAthleteSelected(id: string) {
  if (get(testState) !== 'idle') return;
  athletes.update((current) =>
    current.map((a) => (a.id === id ? { ...a, isSelected: !a.isSelected } : a))
  );
}

export function selectAllAthletes() {
  if (get(testState) !== 'idle') return;
  athletes.update((xs) => xs.map((a) => ({ ...a, isSelected: true })));
}

export function deselectAllAthletes() {
  if (get(testState) !== 'idle') return;
  athletes.update((xs) => xs.map((a) => ({ ...a, isSelected: false })));
}

export function addAthlete(name: string) {
  const clean = name.trim().slice(0, 40);
  if (!clean || get(testState) !== 'idle') return;
  athletes.update((xs) => [
    ...xs,
    {
      id: `athlete_${crypto.randomUUID()}`,
      name: clean,
      status: 'running',
      isSelected: true,
      consecutiveMisses: 0
    }
  ]);
}

export function removeAthlete(id: string) {
  if (get(testState) !== 'idle') return;
  athletes.update((xs) => xs.filter((a) => a.id !== id));
}

export function resetRoster() {
  if (get(testState) !== 'idle') return;
  athletes.set(createDefaultRoster());
}

export async function startTest() {
  const selected = get(selectedAthletes);
  if (!selected.length || get(testState) !== 'idle') return;
  const type = get(selectedTestType);
  athletes.update((xs) => xs.map(resetAthleteForTest));
  undoStack.set([]);
  sessionSavedId.set(undefined);
  elapsedMs.set(0);
  runtime.set(blankRuntime(type));
  lastShuttle = 1;
  await audioClock.start(type);
  testState.set('running');
  beginTick();
  activeTab.set('live');
}

export function pauseTest() {
  if (get(testState) !== 'running') return;
  audioClock.pause();
  elapsedMs.set(audioClock.elapsedMs());
  stopTick();
  testState.set('paused');
}

export async function resumeTest() {
  if (get(testState) !== 'paused') return;
  await audioClock.resume();
  testState.set('running');
  beginTick();
}

export function stopAndFinishTest() {
  const state = get(testState);
  if (state !== 'running' && state !== 'paused') return;
  const type = get(selectedTestType);
  const atRuntime = deriveRuntime(protocolNow(), audioClock.elapsedMs());
  audioClock.pause();
  stopTick();
  runtime.set(atRuntime);
  elapsedMs.set(atRuntime.elapsedMs);
  athletes.update((current) =>
    rankAthletes(
      current.map((athlete) =>
        athlete.isSelected && athlete.finalDistanceMeters === undefined
          ? finalizeAthlete(athlete, type, atRuntime)
          : athlete
      )
    )
  );
  testState.set('completed');
  activeTab.set('leaderboard');
}

export function resetTest() {
  audioClock.stop();
  stopTick();
  testState.set('idle');
  elapsedMs.set(0);
  runtime.set(blankRuntime(get(selectedTestType)));
  athletes.update((current) => current.map(resetAthleteForTest));
  undoStack.set([]);
  sessionSavedId.set(undefined);
  activeTab.set('startup');
}

function pushUndo(athlete: Athlete, description: string) {
  undoStack.update((xs) => [...xs.slice(-9), { athlete, description }]);
}

export function markAthleteMiss(id: string) {
  if (get(testState) !== 'running') return;
  const type = get(selectedTestType);
  const atRuntime = get(runtime);
  const previous = get(athletes).find(
    (a) => a.id === id && a.isSelected && a.status !== 'eliminated'
  );
  if (!previous) return;
  pushUndo(previous, `Undo action for ${previous.name}`);
  athletes.update((current) =>
    rankAthletes(
      current.map((athlete) =>
        athlete.id === id ? applyMiss(athlete, type, atRuntime) : athlete
      )
    )
  );
}

export function eliminateAthlete(id: string) {
  if (get(testState) !== 'running') return;
  const type = get(selectedTestType);
  const atRuntime = get(runtime);
  const previous = get(athletes).find(
    (a) => a.id === id && a.isSelected && a.status !== 'eliminated'
  );
  if (!previous) return;
  pushUndo(previous, `Restore ${previous.name}`);
  athletes.update((current) =>
    rankAthletes(
      current.map((athlete) =>
        athlete.id === id ? finalizeAthlete(athlete, type, atRuntime) : athlete
      )
    )
  );
}

export function undoLastAction() {
  const stack = get(undoStack);
  const last = stack.at(-1);
  if (!last) return;
  athletes.update((current) =>
    rankAthletes(current.map((a) => (a.id === last.athlete.id ? last.athlete : a)))
  );
  undoStack.set(stack.slice(0, -1));
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled.set(enabled);
}

export function setVolumeBoost(value: number) {
  volumeBoost.set(Math.min(3, Math.max(1, value)));
}

export function setBoostEnabled(enabled: boolean) {
  boostEnabled.set(enabled);
}

export async function saveSession(
  customTitle?: string,
  notes = ''
): Promise<string | undefined> {
  if (get(testState) !== 'completed') return undefined;
  const existing = get(sessionSavedId);
  if (existing) return existing;
  const type = get(selectedTestType);
  const protocol = protocolNow();
  const all = get(athletes);
  const finished = all.filter(
    (a) => a.isSelected && a.finalDistanceMeters !== undefined
  );
  if (!finished.length) return undefined;
  const id = crypto.randomUUID();
  const now = Date.now();
  const maxDistance = Math.max(...finished.map((a) => a.finalDistanceMeters ?? 0));
  const best = [...finished].sort(
    (a, b) => (b.finalDistanceMeters ?? 0) - (a.finalDistanceMeters ?? 0)
  )[0];
  const session: TestSession = {
    id,
    testType: type,
    title: customTitle?.trim() || `${protocol.displayName} ${new Date(now).toLocaleDateString()}`,
    timestampMs: now,
    durationSeconds: Math.round(get(elapsedMs) / 1000),
    maxDistanceAchieved: maxDistance,
    maxLevelAchieved: best?.finalLevel ?? '',
    totalAthletesCount: all.filter((a) => a.isSelected).length,
    completedAthletesCount: finished.length,
    notes,
    results: finished
      .map((a) => ({
        athleteName: a.name,
        finalDistanceMeters: a.finalDistanceMeters ?? 0,
        finalLevel: a.finalLevel ?? '',
        warningDistanceMeters: a.warningDistanceMeters,
        warningLevel: a.warningLevel,
        rank: a.rank ?? 0,
        vo2Max: a.vo2Max ?? 0
      }))
      .sort((a, b) => a.rank - b.rank)
  };
  sessions.update((current) => [session, ...current]);
  sessionSavedId.set(id);
  return id;
}

export function deleteSession(id: string) {
  sessions.update((current) => current.filter((s) => s.id !== id));
}
