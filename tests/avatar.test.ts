import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_RECORDS,
  getAthleteAvatar,
  getAthleteFullName,
  getAthleteInitials,
  matchAthleteRecord
} from '../src/domain/avatar.ts';
import { DEFAULT_ATHLETES } from '../src/domain/models.ts';

test('every athlete in DEFAULT_ATHLETES matches an avatar image', () => {
  for (const name of DEFAULT_ATHLETES) {
    const avatar = getAthleteAvatar(name);
    assert.ok(avatar, `Expected avatar for athlete: ${name}`);
    assert.match(avatar, /^\/assets\/avatars\/.+\.png$/);
  }
});

test('distinguishes between Lion and Lionel', () => {
  const lion = matchAthleteRecord('Lion');
  const lionel = matchAthleteRecord('Lionel');
  assert.equal(lion?.name, 'Lion Macak');
  assert.equal(lionel?.name, 'Lionel');
  assert.equal(getAthleteAvatar('Lion'), '/assets/avatars/Lion_Macak.png');
  assert.equal(getAthleteAvatar('Lionel'), '/assets/avatars/Lionel.png');
});

test('supports full names as input', () => {
  assert.equal(getAthleteAvatar('Silas Aldenhoff'), '/assets/avatars/Silas_Aldenhoff.png');
  assert.equal(getAthleteAvatar('Paul Miethe'), '/assets/avatars/Paul_Miethe.png');
  assert.equal(getAthleteFullName('Silas'), 'Silas Aldenhoff');
});

test('computes clean initials and handles unknown athletes gracefully', () => {
  assert.equal(getAthleteInitials('Silas'), 'SI');
  assert.equal(getAthleteInitials('Silas Aldenhoff'), 'SA');
  assert.equal(getAthleteInitials('Arturo Montes Hernandez'), 'AM');
  assert.equal(getAthleteAvatar('Unknown Person'), null);
});
