import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCountFromLogEntry, getLogText, shouldCountLogForGoal } from './goal-utils.mjs';

test('extracts counts from a planned workout description', () => {
  const log = {
    workout: 'Upper Body',
    description: '<ul class="desc-list"><li>50 pushups</li></ul>',
    notes: ''
  };

  assert.equal(extractCountFromLogEntry(log), 50);
  assert.match(getLogText(log), /50 pushups/);
});

test('stops counting logs that happen after a goal is completed', () => {
  const goal = {
    createdAt: 1000,
    completedAt: 2000
  };

  assert.equal(shouldCountLogForGoal({ loggedAt: 1500 }, goal), true);
  assert.equal(shouldCountLogForGoal({ loggedAt: 2000 }, goal), false);
  assert.equal(shouldCountLogForGoal({ loggedAt: 2500 }, goal), false);
});
