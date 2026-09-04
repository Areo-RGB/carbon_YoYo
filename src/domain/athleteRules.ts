import type { Athlete } from './models.ts';
import type { RuntimeSnapshot } from './runtime.ts';
import { getProtocol, type TestType } from './protocol.ts';

export function finalizeAthlete(athlete: Athlete, testType: TestType, runtime: RuntimeSnapshot): Athlete {
  const protocol = getProtocol(testType);
  const distance = runtime.completed ? protocol.maxDistanceMeters : runtime.currentDistanceMeters;
  return {
    ...athlete,
    status: 'eliminated',
    finalDistanceMeters: distance,
    finalLevel: runtime.shuttle.levelDisplay,
    finishTimestampMs: Math.round(runtime.elapsedMs),
    vo2Max: protocol.calculateVo2Max(distance, runtime.shuttle.speedKmh)
  };
}

export function applyMiss(athlete: Athlete, testType: TestType, runtime: RuntimeSnapshot): Athlete {
  if (athlete.status === 'eliminated') return athlete;

  if (testType === 'beepTest') {
    const currentShuttle = runtime.shuttle.shuttleNumber;
    const isConsecutive = athlete.lastMissShuttle === currentShuttle - 1;
    if (isConsecutive) {
      return finalizeAthlete({ ...athlete, consecutiveMisses: 2 }, testType, runtime);
    }
    return {
      ...athlete,
      status: 'warned',
      consecutiveMisses: 1,
      lastMissShuttle: currentShuttle,
      warningDistanceMeters: runtime.currentDistanceMeters,
      warningLevel: runtime.shuttle.levelDisplay,
      warningTimestampMs: Math.round(runtime.elapsedMs)
    };
  }

  // YYIR1: second recorded failure ends the athlete's test. The failures do
  // not have to be consecutive in the same way as the 20 m shuttle test.
  if (athlete.status === 'warned') return finalizeAthlete(athlete, testType, runtime);
  return {
    ...athlete,
    status: 'warned',
    consecutiveMisses: 1,
    lastMissShuttle: runtime.shuttle.shuttleNumber,
    warningDistanceMeters: runtime.currentDistanceMeters,
    warningLevel: runtime.shuttle.levelDisplay,
    warningTimestampMs: Math.round(runtime.elapsedMs)
  };
}

export function clearExpiredBeepWarning(athlete: Athlete, currentShuttle: number): Athlete {
  if (athlete.status !== 'warned' || athlete.lastMissShuttle === undefined) return athlete;
  if (currentShuttle <= athlete.lastMissShuttle + 1) return athlete;
  return {
    ...athlete,
    status: 'running',
    consecutiveMisses: 0,
    lastMissShuttle: undefined
  };
}
