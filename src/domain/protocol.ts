export type TestType = 'yoyoIR1' | 'beepTest';
export type ShuttlePhase = 'running' | 'recovery';

export interface TestShuttle {
  shuttleNumber: number;
  speedLevel: number;
  shuttleInLevel: number;
  speedKmh: number;
  cumulativeDistanceMeters: number;
  runDurationSeconds: number;
  recoveryDurationSeconds: number;
  levelDisplay: string;
}

export interface ProtocolDefinition {
  type: TestType;
  displayName: string;
  fullName: string;
  description: string;
  badges: string[];
  vo2FormulaLabel: string;
  shuttles: TestShuttle[];
  maxDistanceMeters: number;
  calculateVo2Max(distanceMeters: number, speedKmh?: number): number;
  getFitnessRating(distanceMeters: number): string;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function fitnessRating(distanceMeters: number): string {
  if (distanceMeters >= 2400) return 'Elite (Professional)';
  if (distanceMeters >= 2000) return 'Excellent';
  if (distanceMeters >= 1600) return 'Good / Advanced';
  if (distanceMeters >= 1200) return 'Average / Intermediate';
  if (distanceMeters >= 800) return 'Below Average';
  return 'Novice / Needs Improvement';
}

function createYoYoShuttles(): TestShuttle[] {
  const list: TestShuttle[] = [];
  let shuttleNumber = 1;
  let distance = 0;

  const addStage = (speedLevel: number, speedKmh: number, shuttleCount: number) => {
    for (let i = 1; i <= shuttleCount; i += 1) {
      distance += 40;
      list.push({
        shuttleNumber,
        speedLevel,
        shuttleInLevel: i,
        speedKmh,
        cumulativeDistanceMeters: distance,
        runDurationSeconds: 144 / speedKmh,
        recoveryDurationSeconds: 10,
        levelDisplay: `${speedLevel}.${i}`
      });
      shuttleNumber += 1;
    }
  };

  // YYIR1 progression. This intentionally fixes the incorrect Flutter table.
  addStage(5, 10.0, 1);
  addStage(9, 12.0, 1);
  addStage(11, 13.0, 2);
  addStage(12, 13.5, 3);
  addStage(13, 14.0, 4);

  let speed = 14.5;
  for (let level = 14; level <= 23; level += 1) {
    addStage(level, speed, 8);
    speed += 0.5;
  }

  return list;
}

function createBeepShuttles(): TestShuttle[] {
  // 20 m multistage shuttle (Beep Test) matching the bundled beep_test.m4a:
  // Level 1 at 8.0 km/h, Level 2 at 9.0 km/h, then +0.5 km/h per level.
  // Shuttle counts per level verified against the audio beeps
  // (audio 00:10.215 = test time 00:00.000, start of Level 1 Shuttle 1).
  const stages: Array<[number, number, number]> = [
    [1, 8.0, 7], [2, 9.0, 8], [3, 9.5, 8], [4, 10.0, 9],
    [5, 10.5, 9], [6, 11.0, 10], [7, 11.5, 10], [8, 12.0, 11],
    [9, 12.5, 11], [10, 13.0, 11], [11, 13.5, 12], [12, 14.0, 12],
    [13, 14.5, 13], [14, 15.0, 13], [15, 15.5, 13], [16, 16.0, 14],
    [17, 16.5, 14], [18, 17.0, 15], [19, 17.5, 15], [20, 18.0, 16],
    [21, 18.5, 16]
  ];

  const list: TestShuttle[] = [];
  let shuttleNumber = 1;
  let distance = 0;
  for (const [level, speed, count] of stages) {
    for (let i = 1; i <= count; i += 1) {
      distance += 20;
      list.push({
        shuttleNumber,
        speedLevel: level,
        shuttleInLevel: i,
        speedKmh: speed,
        cumulativeDistanceMeters: distance,
        runDurationSeconds: 72 / speed,
        recoveryDurationSeconds: 0,
        levelDisplay: `${level}.${i}`
      });
      shuttleNumber += 1;
    }
  }
  return list;
}

const yoyoShuttles = createYoYoShuttles();
const beepShuttles = createBeepShuttles();

export const PROTOCOLS: Record<TestType, ProtocolDefinition> = {
  yoyoIR1: {
    type: 'yoyoIR1',
    displayName: 'Yo-Yo IR1',
    fullName: 'Yo-Yo Intermittent Recovery Level 1',
    description: 'Progressive intermittent 2 × 20 m shuttle test with 10-second active recovery between 40 m repetitions.',
    badges: ['2 × 20m Shuttles', '10s Active Rest', 'Intermittent Recovery'],
    vo2FormulaLabel: 'VO₂max = Distance × 0.0084 + 36.4',
    shuttles: yoyoShuttles,
    maxDistanceMeters: yoyoShuttles.at(-1)?.cumulativeDistanceMeters ?? 0,
    calculateVo2Max(distanceMeters: number) {
      return distanceMeters <= 0 ? 0 : round1(distanceMeters * 0.0084 + 36.4);
    },
    getFitnessRating: fitnessRating
  },
  beepTest: {
    type: 'beepTest',
    displayName: 'Beep Test',
    fullName: '20m Multi-Stage Fitness Test',
    description: 'Continuous 20 m shuttle run with increasing pace and no recovery interval.',
    badges: ['1 × 20m Shuttles', 'No Rest', '21 Speed Levels'],
    vo2FormulaLabel: 'Adult Léger estimate: VO₂max = 5.857 × speed − 19.458',
    shuttles: beepShuttles,
    maxDistanceMeters: beepShuttles.at(-1)?.cumulativeDistanceMeters ?? 0,
    calculateVo2Max(distanceMeters: number, speedKmh?: number) {
      if (distanceMeters <= 0) return 0;
      let speed = speedKmh ?? 0;
      if (speed <= 0) {
        speed = beepShuttles.find((s) => s.cumulativeDistanceMeters >= distanceMeters)?.speedKmh
          ?? beepShuttles.at(-1)?.speedKmh
          ?? 0;
      }
      return round1(5.857 * speed - 19.458);
    },
    getFitnessRating: fitnessRating
  }
};

export function getProtocol(type: TestType): ProtocolDefinition {
  return PROTOCOLS[type];
}
