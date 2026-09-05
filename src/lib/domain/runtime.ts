import type { ProtocolDefinition, ShuttlePhase, TestShuttle } from './protocol.ts';

export interface RuntimeSnapshot {
  completed: boolean;
  shuttle: TestShuttle;
  shuttleIndex: number;
  phase: ShuttlePhase;
  elapsedMs: number;
  shuttleElapsedMs: number;
  phaseRemainingSeconds: number;
  currentDistanceMeters: number;
  progress: number;
}

export function protocolDurationMs(protocol: ProtocolDefinition): number {
  return Math.round(protocol.shuttles.reduce(
    (total, s) => total + (s.runDurationSeconds + s.recoveryDurationSeconds) * 1000,
    0
  ));
}

export function deriveRuntime(protocol: ProtocolDefinition, rawElapsedMs: number): RuntimeSnapshot {
  const elapsedMs = Math.max(0, rawElapsedMs);
  const shuttles = protocol.shuttles;
  if (shuttles.length === 0) throw new Error('Protocol has no shuttles');

  let cursor = 0;
  for (let index = 0; index < shuttles.length; index += 1) {
    const shuttle = shuttles[index];
    const runMs = shuttle.runDurationSeconds * 1000;
    const recoveryMs = shuttle.recoveryDurationSeconds * 1000;
    const shuttleEnd = cursor + runMs + recoveryMs;

    if (elapsedMs < shuttleEnd) {
      const inRun = elapsedMs < cursor + runMs;
      const phaseStart = inRun ? cursor : cursor + runMs;
      const phaseDurationMs = inRun ? runMs : recoveryMs;
      const phaseElapsed = Math.max(0, elapsedMs - phaseStart);
      return {
        completed: false,
        shuttle,
        shuttleIndex: index,
        phase: inRun ? 'running' : 'recovery',
        elapsedMs,
        shuttleElapsedMs: elapsedMs - cursor,
        phaseRemainingSeconds: Math.max(0, (phaseDurationMs - phaseElapsed) / 1000),
        currentDistanceMeters: inRun
          ? (index === 0 ? 0 : shuttles[index - 1].cumulativeDistanceMeters)
          : shuttle.cumulativeDistanceMeters,
        progress: Math.min(1, elapsedMs / protocolDurationMs(protocol))
      };
    }
    cursor = shuttleEnd;
  }

  const last = shuttles.at(-1)!;
  return {
    completed: true,
    shuttle: last,
    shuttleIndex: shuttles.length - 1,
    phase: last.recoveryDurationSeconds > 0 ? 'recovery' : 'running',
    elapsedMs,
    shuttleElapsedMs: (last.runDurationSeconds + last.recoveryDurationSeconds) * 1000,
    phaseRemainingSeconds: 0,
    currentDistanceMeters: last.cumulativeDistanceMeters,
    progress: 1
  };
}

export function completedDistanceAt(protocol: ProtocolDefinition, elapsedMs: number): number {
  return deriveRuntime(protocol, elapsedMs).currentDistanceMeters;
}
