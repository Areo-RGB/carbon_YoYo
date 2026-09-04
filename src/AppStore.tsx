import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDefaultRoster, type AppTab, type Athlete, type TestSession, type TestState } from './domain/models.ts';
import { getProtocol, type TestType } from './domain/protocol.ts';
import { deriveRuntime, type RuntimeSnapshot } from './domain/runtime.ts';
import { rankAthletes } from './domain/results.ts';
import { applyMiss, clearExpiredBeepWarning, finalizeAthlete } from './domain/athleteRules.ts';
import { ProtocolAudioClock } from './services/audioClock.ts';
import { loadPersistedState, savePersistedState } from './services/persistence.ts';

interface UndoEntry { athlete: Athlete; description: string }

export interface AppStoreValue {
  activeTab: AppTab;
  selectedTestType: TestType;
  athletes: Athlete[];
  selectedAthletes: Athlete[];
  testState: TestState;
  elapsedMs: number;
  runtime: RuntimeSnapshot;
  soundEnabled: boolean;
  volumeBoost: number;
  boostEnabled: boolean;
  sessions: TestSession[];
  sessionSavedId?: string;
  undoDescription?: string;
  setActiveTab(tab: AppTab): void;
  setSelectedTestType(type: TestType): void;
  toggleAthleteSelected(id: string): void;
  selectAllAthletes(): void;
  deselectAllAthletes(): void;
  addAthlete(name: string): void;
  removeAthlete(id: string): void;
  resetRoster(): void;
  startTest(): Promise<void>;
  pauseTest(): void;
  resumeTest(): Promise<void>;
  stopAndFinishTest(): void;
  resetTest(): void;
  markAthleteMiss(id: string): void;
  eliminateAthlete(id: string): void;
  undoLastAction(): void;
  toggleSound(): void;
  setVolumeBoost(value: number): void;
  setBoostEnabled(enabled: boolean): void;
  saveSession(title?: string, notes?: string): Promise<string | undefined>;
  deleteSession(id: string): void;
}

const AppStore = createContext<AppStoreValue | null>(null);

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

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AppTab>('startup');
  const [selectedTestType, setSelectedTestTypeState] = useState<TestType>('yoyoIR1');
  const [athletes, setAthletes] = useState<Athlete[]>(createDefaultRoster);
  const [testState, setTestState] = useState<TestState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>(() => blankRuntime('yoyoIR1'));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volumeBoost, setVolumeBoostState] = useState(1);
  const [boostEnabled, setBoostEnabledState] = useState(true);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [sessionSavedId, setSessionSavedId] = useState<string>();
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const audioClock = useRef(new ProtocolAudioClock());
  const rafRef = useRef<number>();
  const lastRuntimeShuttleRef = useRef(0);

  const protocol = getProtocol(selectedTestType);
  const selectedAthletes = useMemo(() => athletes.filter((a) => a.isSelected), [athletes]);

  useEffect(() => {
    void loadPersistedState().then((stored) => {
      if (stored.roster.length) setAthletes(stored.roster.map(resetAthleteForTest));
      setSessions(stored.sessions);
      setVolumeBoostState(stored.volumeBoost);
      setBoostEnabledState(stored.boostEnabled);
      audioClock.current.setBoost(stored.boostEnabled ? stored.volumeBoost : 1);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void savePersistedState({ sessions, roster: athletes.map(resetAthleteForTest), volumeBoost, boostEnabled });
  }, [sessions, athletes, volumeBoost, boostEnabled, hydrated]);

  useEffect(() => {
    audioClock.current.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audioClock.current.setBoost(boostEnabled ? volumeBoost : 1);
  }, [boostEnabled, volumeBoost]);

  const completeNaturally = useCallback((atRuntime: RuntimeSnapshot) => {
    setAthletes((current) => rankAthletes(current.map((athlete) =>
      athlete.isSelected && athlete.finalDistanceMeters === undefined
        ? finalizeAthlete(athlete, selectedTestType, atRuntime)
        : athlete
    )));
    setTestState('completed');
    setElapsedMs(atRuntime.elapsedMs);
    audioClock.current.stop();
  }, [selectedTestType]);

  useEffect(() => {
    if (testState !== 'running') return;
    const tick = () => {
      const nextElapsed = audioClock.current.elapsedMs();
      const nextRuntime = deriveRuntime(protocol, nextElapsed);
      setElapsedMs(nextElapsed);
      setRuntime(nextRuntime);

      // For Beep Test, a warning only remains live if the next shuttle was also
      // missed. Once a later shuttle begins without a consecutive miss, clear it.
      if (selectedTestType === 'beepTest' && nextRuntime.shuttle.shuttleNumber !== lastRuntimeShuttleRef.current) {
        const currentShuttle = nextRuntime.shuttle.shuttleNumber;
        setAthletes((current) => current.map((a) => {
          return clearExpiredBeepWarning(a, currentShuttle);
        }));
        lastRuntimeShuttleRef.current = currentShuttle;
      }

      if (nextRuntime.completed) {
        completeNaturally(nextRuntime);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current); };
  }, [testState, protocol, selectedTestType, completeNaturally]);

  const setSelectedTestType = (type: TestType) => {
    if (testState !== 'idle') return;
    setSelectedTestTypeState(type);
    setRuntime(blankRuntime(type));
    setElapsedMs(0);
  };

  const toggleAthleteSelected = (id: string) => {
    if (testState !== 'idle') return;
    setAthletes((current) => current.map((a) => a.id === id ? { ...a, isSelected: !a.isSelected } : a));
  };
  const selectAllAthletes = () => { if (testState === 'idle') setAthletes((xs) => xs.map((a) => ({ ...a, isSelected: true }))); };
  const deselectAllAthletes = () => { if (testState === 'idle') setAthletes((xs) => xs.map((a) => ({ ...a, isSelected: false }))); };
  const addAthlete = (name: string) => {
    const clean = name.trim();
    if (!clean || testState !== 'idle') return;
    setAthletes((xs) => [...xs, { id: `athlete_${crypto.randomUUID()}`, name: clean, status: 'running', isSelected: true, consecutiveMisses: 0 }]);
  };
  const removeAthlete = (id: string) => { if (testState === 'idle') setAthletes((xs) => xs.filter((a) => a.id !== id)); };
  const resetRoster = () => { if (testState === 'idle') setAthletes(createDefaultRoster()); };

  const startTest = async () => {
    if (!selectedAthletes.length || testState !== 'idle') return;
    const reset = athletes.map((a) => resetAthleteForTest(a));
    setAthletes(reset);
    setUndoStack([]);
    setSessionSavedId(undefined);
    setElapsedMs(0);
    setRuntime(blankRuntime(selectedTestType));
    lastRuntimeShuttleRef.current = 1;
    await audioClock.current.start(selectedTestType);
    setTestState('running');
    setActiveTab('live');
  };

  const pauseTest = () => {
    if (testState !== 'running') return;
    audioClock.current.pause();
    setElapsedMs(audioClock.current.elapsedMs());
    setTestState('paused');
  };

  const resumeTest = async () => {
    if (testState !== 'paused') return;
    await audioClock.current.resume();
    setTestState('running');
  };

  const stopAndFinishTest = () => {
    if (testState !== 'running' && testState !== 'paused') return;
    const atRuntime = deriveRuntime(protocol, audioClock.current.elapsedMs());
    audioClock.current.pause();
    setRuntime(atRuntime);
    setElapsedMs(atRuntime.elapsedMs);
    setAthletes((current) => rankAthletes(current.map((athlete) =>
      athlete.isSelected && athlete.finalDistanceMeters === undefined
        ? finalizeAthlete(athlete, selectedTestType, atRuntime)
        : athlete
    )));
    setTestState('completed');
    setActiveTab('leaderboard');
  };

  const resetTest = () => {
    audioClock.current.stop();
    setTestState('idle');
    setElapsedMs(0);
    setRuntime(blankRuntime(selectedTestType));
    setAthletes((current) => current.map(resetAthleteForTest));
    setUndoStack([]);
    setSessionSavedId(undefined);
    setActiveTab('startup');
  };

  const pushUndo = (athlete: Athlete, description: string) => setUndoStack((xs) => [...xs.slice(-9), { athlete, description }]);

  const markAthleteMiss = (id: string) => {
    if (testState !== 'running') return;
    const previous = athletes.find((a) => a.id === id && a.isSelected && a.status !== 'eliminated');
    if (!previous) return;
    pushUndo(previous, `Undo action for ${previous.name}`);
    setAthletes((current) => rankAthletes(current.map((athlete) =>
      athlete.id === id ? applyMiss(athlete, selectedTestType, runtime) : athlete
    )));
  };

  const eliminateAthlete = (id: string) => {
    if (testState !== 'running') return;
    const previous = athletes.find((a) => a.id === id && a.isSelected && a.status !== 'eliminated');
    if (!previous) return;
    pushUndo(previous, `Restore ${previous.name}`);
    setAthletes((current) => rankAthletes(current.map((athlete) =>
      athlete.id === id ? finalizeAthlete(athlete, selectedTestType, runtime) : athlete
    )));
  };

  const undoLastAction = () => {
    setUndoStack((stack) => {
      const last = stack.at(-1);
      if (!last) return stack;
      setAthletes((current) => rankAthletes(current.map((a) => a.id === last.athlete.id ? last.athlete : a)));
      return stack.slice(0, -1);
    });
  };

  const toggleSound = () => setSoundEnabled((x) => !x);
  const setVolumeBoost = (value: number) => setVolumeBoostState(Math.min(3, Math.max(1, value)));
  const setBoostEnabled = (enabled: boolean) => setBoostEnabledState(enabled);

  const saveSession = async (customTitle?: string, notes = ''): Promise<string | undefined> => {
    if (testState !== 'completed') return undefined;
    if (sessionSavedId) return sessionSavedId;
    const finished = athletes.filter((a) => a.isSelected && a.finalDistanceMeters !== undefined);
    if (!finished.length) return undefined;
    const id = crypto.randomUUID();
    const now = Date.now();
    const typeName = protocol.displayName;
    const maxDistance = Math.max(...finished.map((a) => a.finalDistanceMeters ?? 0));
    const best = [...finished].sort((a, b) => (b.finalDistanceMeters ?? 0) - (a.finalDistanceMeters ?? 0))[0];
    const session: TestSession = {
      id,
      testType: selectedTestType,
      title: customTitle?.trim() || `${typeName} ${new Date(now).toLocaleDateString()}`,
      timestampMs: now,
      durationSeconds: Math.round(elapsedMs / 1000),
      maxDistanceAchieved: maxDistance,
      maxLevelAchieved: best?.finalLevel ?? '',
      totalAthletesCount: selectedAthletes.length,
      completedAthletesCount: finished.length,
      notes,
      results: finished.map((a) => ({
        athleteName: a.name,
        finalDistanceMeters: a.finalDistanceMeters ?? 0,
        finalLevel: a.finalLevel ?? '',
        warningDistanceMeters: a.warningDistanceMeters,
        warningLevel: a.warningLevel,
        rank: a.rank ?? 0,
        vo2Max: a.vo2Max ?? 0
      })).sort((a, b) => a.rank - b.rank)
    };
    setSessions((current) => [session, ...current]);
    setSessionSavedId(id);
    return id;
  };

  const deleteSession = (id: string) => setSessions((current) => current.filter((s) => s.id !== id));

  const value: AppStoreValue = {
    activeTab, selectedTestType, athletes, selectedAthletes, testState, elapsedMs, runtime,
    soundEnabled, volumeBoost, boostEnabled, sessions, sessionSavedId,
    undoDescription: undoStack.at(-1)?.description,
    setActiveTab, setSelectedTestType, toggleAthleteSelected, selectAllAthletes, deselectAllAthletes,
    addAthlete, removeAthlete, resetRoster, startTest, pauseTest, resumeTest, stopAndFinishTest, resetTest,
    markAthleteMiss, eliminateAthlete, undoLastAction, toggleSound, setVolumeBoost, setBoostEnabled,
    saveSession, deleteSession
  };

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider');
  return value;
}
