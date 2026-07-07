#!/usr/bin/env node
// Baseline-diff gate for the `noCheck: true` migration (see
// .superpowers/sdd/nocheck-audit.md, section 4). Runs the full
// `tsc --noCheck false` pass, compares it against a committed list of
// known/pre-existing errors, and fails only when a genuinely NEW error
// shows up. Lets the wave-by-wave cleanup land without blocking on the
// (large) set of already-known, already-triaged errors.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_PATH = '.typecheck-baseline.txt';
// Ignore line/col churn from unrelated edits elsewhere in the file.
// Normalize: strip line/col AND any absolute path prefixes (error text
// can embed the checkout's absolute path inside cross-module type names,
// which broke the guard on any other machine/worktree).
const norm = (line) => line
  .replace(/\(\d+,\d+\)/, '(L,C)')
  .replace(/(["'( ])\/[^"'()\s]*\/(src|node_modules)\//g, '$1$2/');

let out = '';
try {
  execSync('npx tsc -p tsconfig.app.json --noEmit --noCheck false', {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
} catch (e) {
  out = e.stdout ?? '';
}
const current = new Set(
  out.split('\n').filter((l) => l.includes('error TS')).map(norm)
);

if (process.argv.includes('--write-baseline')) {
  writeFileSync(BASELINE_PATH, [...current].sort().join('\n') + '\n');
  console.log(`Wrote baseline: ${current.size} known errors.`);
  process.exit(0);
}

const baseline = new Set(
  existsSync(BASELINE_PATH)
    ? readFileSync(BASELINE_PATH, 'utf8').split('\n').filter(Boolean)
    : []
);
const newErrors = [...current].filter((l) => !baseline.has(l));
const fixed = [...baseline].filter((l) => !current.has(l));

if (fixed.length) {
  console.log(`${fixed.length} baseline error(s) fixed — re-run with --write-baseline to shrink the baseline.`);
}
if (newErrors.length) {
  console.error(`${newErrors.length} NEW type error(s) not in baseline:\n` + newErrors.join('\n'));
  process.exit(1);
}
console.log(`OK — ${current.size} errors, all pre-existing (baseline: ${baseline.size}).`);
