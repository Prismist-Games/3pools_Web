import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runBatchPlaytest } from './simulationCore.js';
import { PLAYER_MODELS } from './playerModels.js';

function parseArgs(argv) {
  const out = { seeds: [101, 202, 303, 404, 505], turns: 8, out: 'playtest-reports/latest.md' };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seeds') out.seeds = argv[++i].split(',').map(Number);
    if (arg === '--turns') out.turns = Number(argv[++i]);
    if (arg === '--out') out.out = argv[++i];
  }
  return out;
}

function ratio(a, b) {
  if (!b) return '0%';
  return `${Math.round((a / b) * 100)}%`;
}

function formatSummary(report) {
  const lines = [
    '# Playtest Report',
    '',
    '## Summary',
    '',
    '| Player | Row choices | Column choices | Column rate | Reason types | Submissions |',
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const [player, data] of Object.entries(report.summary.players)) {
    const total = data.rowChoices + data.columnChoices;
    lines.push(`| ${player} | ${data.rowChoices || 0} | ${data.columnChoices || 0} | ${ratio(data.columnChoices || 0, total)} | ${data.uniqueReasonTags || 0} | ${data.submissions || 0} |`);
  }
  return lines;
}

function formatTranscript(run) {
  const lines = [
    '',
    `## Sample: ${run.player} / seed ${run.seed}`,
    '',
  ];
  const sample = run.transcript.filter(step => step.event === 'draw').slice(0, 14);
  for (const step of sample) {
    lines.push(`- T${step.turn} ${step.market}: ${step.action.type === 'row' ? '行' : '列'} ${step.action.label} -> ${step.result.type}${step.result.item ? ` (${step.result.item})` : ''}`);
    lines.push(`  Reason: ${step.reason}`);
  }
  const submits = run.transcript.filter(step => step.event === 'submit').slice(0, 4);
  if (submits.length) {
    lines.push('', 'Submissions:');
    for (const step of submits) {
      lines.push(`- T${step.turn}: ${step.order} -> ${step.reward}`);
    }
  }
  return lines;
}

function main() {
  const args = parseArgs(process.argv);
  const report = runBatchPlaytest({
    seeds: args.seeds,
    turnsPerRun: args.turns,
    players: Object.values(PLAYER_MODELS),
  });

  const lines = formatSummary(report);
  for (const player of Object.keys(report.summary.players)) {
    const run = report.runs.find(item => item.player === player);
    if (run) lines.push(...formatTranscript(run));
  }

  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Playtest report written to ${outPath}`);
}

main();
