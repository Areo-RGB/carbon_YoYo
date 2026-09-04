import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtocol } from '../src/domain/protocol.ts';
import { deriveRuntime, protocolDurationMs } from '../src/domain/runtime.ts';

test('Yo-Yo IR1 golden protocol table has 91 repetitions and 3640 m', () => {
  const p = getProtocol('yoyoIR1');
  assert.equal(p.shuttles.length, 91);
  assert.equal(p.maxDistanceMeters, 3640);

  const expectedStageStarts = [
    [5, 10.0], [9, 12.0], [11, 13.0], [12, 13.5], [13, 14.0],
    [14, 14.5], [15, 15.0], [16, 15.5], [17, 16.0], [18, 16.5],
    [19, 17.0], [20, 17.5], [21, 18.0], [22, 18.5], [23, 19.0]
  ];
  for (const [level, speed] of expectedStageStarts) {
    assert.equal(p.shuttles.find((s) => s.speedLevel === level)?.speedKmh, speed);
  }
});

test('Yo-Yo IR1 total duration matches the corrected audio schedule', () => {
  const p = getProtocol('yoyoIR1');
  assert.ok(Math.abs(protocolDurationMs(p) - 1_724_581) <= 1);
});

test('Yo-Yo runtime boundaries do not award a shuttle before it completes', () => {
  const p = getProtocol('yoyoIR1');
  const firstRunMs = p.shuttles[0].runDurationSeconds * 1000;
  const firstTotalMs = (p.shuttles[0].runDurationSeconds + 10) * 1000;

  const beforeRunEnd = deriveRuntime(p, firstRunMs - 1);
  assert.equal(beforeRunEnd.phase, 'running');
  assert.equal(beforeRunEnd.currentDistanceMeters, 0);

  const recovery = deriveRuntime(p, firstRunMs + 1);
  assert.equal(recovery.phase, 'recovery');
  assert.equal(recovery.currentDistanceMeters, 40);

  const secondStarts = deriveRuntime(p, firstTotalMs + 1);
  assert.equal(secondStarts.shuttle.shuttleNumber, 2);
  assert.equal(secondStarts.currentDistanceMeters, 40);
});

test('Beep Test has the standard 21-level shuttle count represented by this table', () => {
  const p = getProtocol('beepTest');
  assert.equal(p.shuttles.length, 247);
  assert.equal(p.maxDistanceMeters, 4940);
  assert.equal(p.shuttles[0].speedKmh, 8.0);
  assert.equal(p.shuttles.at(-1)?.speedKmh, 18.5);
  // 20 m shuttles: Level 1 at 8.0 km/h takes 9.0 s, Level 2 at 9.0 km/h takes 8.0 s.
  assert.equal(p.shuttles[0].runDurationSeconds, 9.0);
  assert.equal(p.shuttles[7].runDurationSeconds, 8.0);
  assert.equal(p.shuttles[7].speedLevel, 2);
});

test('VO2 calculations are stable at reference inputs', () => {
  const yoyo = getProtocol('yoyoIR1');
  assert.equal(yoyo.calculateVo2Max(1600), 49.8);

  const beep = getProtocol('beepTest');
  assert.equal(beep.calculateVo2Max(1000, 12.0), 50.8);
});

import { applyMiss, clearExpiredBeepWarning, finalizeAthlete } from '../src/domain/athleteRules.ts';
import type { Athlete } from '../src/domain/models.ts';

const baseAthlete: Athlete = {
  id: 'a1', name: 'Athlete', status: 'running', isSelected: true, consecutiveMisses: 0
};

test('Beep Test eliminates only on a consecutive next-shuttle miss', () => {
  const p = getProtocol('beepTest');
  const shuttle1 = deriveRuntime(p, 1);
  const firstMiss = applyMiss(baseAthlete, 'beepTest', shuttle1);
  assert.equal(firstMiss.status, 'warned');
  assert.equal(firstMiss.lastMissShuttle, 1);

  const shuttle2StartMs = p.shuttles[0].runDurationSeconds * 1000 + 1;
  const shuttle2 = deriveRuntime(p, shuttle2StartMs);
  const secondConsecutiveMiss = applyMiss(firstMiss, 'beepTest', shuttle2);
  assert.equal(secondConsecutiveMiss.status, 'eliminated');
});

test('Beep Test warning clears after a successful intervening shuttle', () => {
  const p = getProtocol('beepTest');
  const firstMiss = applyMiss(baseAthlete, 'beepTest', deriveRuntime(p, 1));
  const afterSuccessfulShuttle = clearExpiredBeepWarning(firstMiss, 3);
  assert.equal(afterSuccessfulShuttle.status, 'running');
  assert.equal(afterSuccessfulShuttle.consecutiveMisses, 0);

  let cursorMs = 0;
  cursorMs += p.shuttles[0].runDurationSeconds * 1000;
  cursorMs += p.shuttles[1].runDurationSeconds * 1000;
  const shuttle3 = deriveRuntime(p, cursorMs + 1);
  const laterMiss = applyMiss(afterSuccessfulShuttle, 'beepTest', shuttle3);
  assert.equal(laterMiss.status, 'warned');
  assert.notEqual(laterMiss.status, 'eliminated');
});

test('natural completion finalizes an athlete at protocol maximum', () => {
  const p = getProtocol('yoyoIR1');
  const completed = deriveRuntime(p, protocolDurationMs(p) + 1);
  const finished = finalizeAthlete(baseAthlete, 'yoyoIR1', completed);
  assert.equal(finished.finalDistanceMeters, 3640);
  assert.equal(finished.finalLevel, '23.8');
  assert.equal(finished.status, 'eliminated');
});
