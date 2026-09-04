import type { TestType } from './protocol.ts';

export type AthleteStatus = 'running' | 'warned' | 'eliminated';
export type TestState = 'idle' | 'running' | 'paused' | 'completed';
export type AppTab = 'startup' | 'setup' | 'live' | 'leaderboard' | 'tabelle' | 'history' | 'sync' | 'settings';

export interface Athlete {
  id: string;
  name: string;
  status: AthleteStatus;
  isSelected: boolean;
  consecutiveMisses: number;
  lastMissShuttle?: number;
  warningDistanceMeters?: number;
  warningLevel?: string;
  warningTimestampMs?: number;
  finalDistanceMeters?: number;
  finalLevel?: string;
  finishTimestampMs?: number;
  rank?: number;
  vo2Max?: number;
}

export interface AthleteResult {
  athleteName: string;
  finalDistanceMeters: number;
  finalLevel: string;
  warningDistanceMeters?: number;
  warningLevel?: string;
  rank: number;
  vo2Max: number;
}

export interface TestSession {
  id: string;
  testType: TestType;
  title: string;
  timestampMs: number;
  durationSeconds: number;
  maxDistanceAchieved: number;
  maxLevelAchieved: string;
  totalAthletesCount: number;
  completedAthletesCount: number;
  notes: string;
  results: AthleteResult[];
}

export const DEFAULT_ATHLETES = [
  'Silas', 'Finley', 'Arvid', 'Lion', 'Jakob', 'Paul', 'Lennox', 'Levi',
  'Lasse', 'Milan', 'Lionel', 'Arturo', 'Peter', 'Tommy', 'Alex', 'Tayo'
];

export function createDefaultRoster(): Athlete[] {
  return DEFAULT_ATHLETES.map((name, index) => ({
    id: `athlete_${index + 1}`,
    name,
    status: 'running',
    isSelected: true,
    consecutiveMisses: 0
  }));
}
