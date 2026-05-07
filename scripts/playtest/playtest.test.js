import assert from 'node:assert/strict';
import { runBatchPlaytest } from './simulationCore.js';
import { PLAYER_MODELS } from './playerModels.js';

const report = runBatchPlaytest({
  seeds: [101, 202, 303],
  turnsPerRun: 6,
  players: [PLAYER_MODELS.intuitive, PLAYER_MODELS.cautious, PLAYER_MODELS.quality, PLAYER_MODELS.strategic],
});

assert.equal(report.runs.length, 12);
assert.ok(report.summary.players.strategic.columnChoices > 0, 'strategic player should use purchase-method columns');
assert.ok(report.summary.players.intuitive.rowChoices > 0, 'intuitive player should use stall rows');
assert.ok(report.summary.players.strategic.uniqueReasonTags >= 3, 'strategic player should produce varied decision reasons');

const sample = report.runs.find(run => run.player === 'strategic');
assert.ok(sample.transcript.some(step => step.reason), 'transcript should record reasons');
assert.ok(sample.transcript.some(step => step.action?.type === 'column'), 'strategic transcript should include column choices');

console.log('playtest harness tests passed');
